import {
  useEffect,
  useRef,
  useState,
} from 'react'

import {
  createDecartClient,
  models,
  resolveFpsNumber,
} from '@decartai/sdk'

type GarmentSource =
  | 'page'
  | 'file'
  | 'drop'

type Garment = {
  url: string
  source: GarmentSource
  name: string
}

type CameraStatus =
  | 'idle'
  | 'starting'
  | 'active'
  | 'error'

type AiStatus =
  | 'idle'
  | 'connecting'
  | 'active'
  | 'error'

type CameraDevice = {
  deviceId: string
  label: string
}

type RealtimeClientLike = {
  disconnect: () => void

  setImage: (
    image: Blob,
    options: {
      prompt: string
      enhance: boolean
    },
  ) => Promise<void>
}

let highlightedImage:
  | HTMLImageElement
  | null = null

const HIGHLIGHT_CLASS =
  'anywear-hover-highlight'

const PICKER_BODY_CLASS =
  'anywear-picker-active'

const HIGHLIGHT_STYLE_ID =
  'anywear-replica-highlight-style'

const HOST_ID =
  'anywear-replica-host'

const BACKEND_URL =
  'http://localhost:5050'

/* =========================================================
   IMAGE HELPERS
   ========================================================= */

function getImageFromTarget(
  target: EventTarget | null,
): HTMLImageElement | null {
  if (!(target instanceof Element)) {
    return null
  }

  const directImage =
    target.closest('img')

  if (
    directImage instanceof
    HTMLImageElement
  ) {
    return directImage
  }

  const link =
    target.closest('a, picture')

  if (link) {
    const image =
      link.querySelector('img')

    if (
      image instanceof
      HTMLImageElement
    ) {
      return image
    }
  }

  return null
}

function getImageUrl(
  image: HTMLImageElement,
): string {
  return (
    image.currentSrc ||
    image.src ||
    image.getAttribute(
      'data-src',
    ) ||
    image.getAttribute(
      'data-lazy-src',
    ) ||
    image.getAttribute(
      'data-original',
    ) ||
    ''
  )
}

function getImageName(
  image: HTMLImageElement,
): string {
  const alt =
    image.alt?.trim()

  if (alt) {
    return alt
  }

  const url =
    getImageUrl(image)

  try {
    const pathname =
      new URL(url).pathname

    const fileName =
      pathname.split('/').pop()

    if (fileName) {
      return decodeURIComponent(
        fileName,
      )
    }
  } catch {
    // Ignore invalid URLs.
  }

  return 'Selected garment'
}

function isUsableImage(
  image: HTMLImageElement,
): boolean {
  if (!image) {
    return false
  }

  const url =
    getImageUrl(image)

  if (!url) {
    return false
  }

  if (
    url.startsWith('data:') ||
    url.startsWith('blob:') ||
    url.endsWith('.svg') ||
    url.includes(
      'data:image/svg',
    )
  ) {
    return false
  }

  const width =
    image.naturalWidth ||
    image.width

  const height =
    image.naturalHeight ||
    image.height

  return (
    width >= 120 &&
    height >= 120
  )
}

/* =========================================================
   IMAGE HIGHLIGHT
   ========================================================= */

function clearHighlightedImage() {
  if (!highlightedImage) {
    return
  }

  highlightedImage.classList.remove(
    HIGHLIGHT_CLASS,
  )

  highlightedImage = null
}

function highlightImage(
  image: HTMLImageElement,
) {
  if (
    highlightedImage === image
  ) {
    return
  }

  clearHighlightedImage()

  image.classList.add(
    HIGHLIGHT_CLASS,
  )

  highlightedImage = image
}

function installHighlightStyles() {
  if (
    document.getElementById(
      HIGHLIGHT_STYLE_ID,
    )
  ) {
    return
  }

  const style =
    document.createElement(
      'style',
    )

  style.id =
    HIGHLIGHT_STYLE_ID

  style.textContent = `
    body.${PICKER_BODY_CLASS} img {
      transition:
        outline-color 180ms
          cubic-bezier(0.22, 1, 0.36, 1),
        outline-offset 180ms
          cubic-bezier(0.22, 1, 0.36, 1),
        box-shadow 180ms
          cubic-bezier(0.22, 1, 0.36, 1),
        transform 180ms
          cubic-bezier(0.22, 1, 0.36, 1),
        filter 180ms
          cubic-bezier(0.22, 1, 0.36, 1)
          !important;
    }

    body.${PICKER_BODY_CLASS}
    img.${HIGHLIGHT_CLASS} {
      outline:
        2px solid
        rgba(17, 17, 17, 0.92)
        !important;

      outline-offset:
        4px !important;

      box-shadow:
        0 0 0 6px
          rgba(255, 255, 255, 0.90),
        0 8px 30px
          rgba(0, 0, 0, 0.18)
          !important;

      transform:
        scale(1.015)
        !important;

      filter:
        drop-shadow(
          0 4px 12px
          rgba(0, 0, 0, 0.12)
        )
        !important;

      cursor:
        crosshair !important;
    }
  `

  document.head.appendChild(
    style,
  )
}

function removePickerBodyState() {
  document.body.classList.remove(
    PICKER_BODY_CLASS,
  )
}

/* =========================================================
   DATA URL → BLOB
   ========================================================= */

function dataUrlToBlob(
  dataUrl: string,
): Blob {
  const parts =
    dataUrl.split(',')

  const metadata =
    parts[0]

  const base64 =
    parts[1]

  const mimeMatch =
    metadata.match(
      /data:(.*?);base64/,
    )

  const mime =
    mimeMatch?.[1] ||
    'image/jpeg'

  const binary =
    atob(base64)

  const bytes =
    new Uint8Array(
      binary.length,
    )

  for (
    let index = 0;
    index <
    binary.length;
    index++
  ) {
    bytes[index] =
      binary.charCodeAt(
        index,
      )
  }

  return new Blob(
    [bytes],
    {
      type: mime,
    },
  )
}

/* =========================================================
   GARMENT FETCH
   ========================================================= */

async function getGarmentBlob(
  garment: Garment,
): Promise<Blob> {
  if (
    garment.source ===
    'page'
  ) {
    const response =
      await new Promise<{
        ok: boolean
        dataUrl?: string
        error?: string
      }>((resolve) => {
        chrome.runtime.sendMessage(
          {
            type:
              'ANYWEAR_FETCH_IMAGE',

            url: garment.url,
          },
          (
            result,
          ) => {
            if (
              chrome.runtime
                .lastError
            ) {
              resolve({
                ok: false,
                error:
                  chrome.runtime
                    .lastError
                    .message ||
                  'Extension image fetch failed.',
              })

              return
            }

            resolve(
              result,
            )
          },
        )
      })

    if (
      !response.ok ||
      !response.dataUrl
    ) {
      throw new Error(
        response.error ||
          'Unable to retrieve garment image.',
      )
    }

    return dataUrlToBlob(
      response.dataUrl,
    )
  }

  const response =
    await fetch(
      garment.url,
    )

  if (!response.ok) {
    throw new Error(
      `Garment image request failed with status ${response.status}.`,
    )
  }

  return response.blob()
}

/* =========================================================
   MAIN APP
   ========================================================= */

export default function App() {
  const [open, setOpen] =
    useState(false)

  const [pickerActive, setPickerActive] =
    useState(false)

  const [garment, setGarment] =
    useState<Garment | null>(null)

  const [
    cameraStatus,
    setCameraStatus,
  ] = useState<CameraStatus>(
    'idle',
  )

  const [cameraError, setCameraError] =
    useState('')

  const [cameraDevices, setCameraDevices] =
    useState<CameraDevice[]>([])

  const [selectedCameraId, setSelectedCameraId] =
    useState('')

  const [mirrored, setMirrored] =
    useState(true)

  const [aiStatus, setAiStatus] =
    useState<AiStatus>('idle')

  const [aiError, setAiError] =
    useState('')

  const [aiConnected, setAiConnected] =
    useState(false)

  const fileInputRef =
    useRef<
      HTMLInputElement | null
    >(null)

  const objectUrlRef =
    useRef<string | null>(null)

  const videoRef =
    useRef<
      HTMLVideoElement | null
    >(null)

  const aiVideoRef =
    useRef<
      HTMLVideoElement | null
    >(null)

  const cameraStreamRef =
    useRef<
      MediaStream | null
    >(null)

  const realtimeClientRef =
    useRef<
      RealtimeClientLike | null
    >(null)

  const cameraRequestIdRef =
    useRef(0)

  const aiRequestIdRef =
    useRef(0)

  /* =======================================================
     CAMERA DEVICES
     ======================================================= */

  const loadCameraDevices =
    async () => {
      try {
        if (
          !navigator.mediaDevices
        ) {
          return
        }

        const devices =
          await navigator.mediaDevices.enumerateDevices()

        const cameras =
          devices
            .filter(
              (device) =>
                device.kind ===
                'videoinput',
            )
            .map(
              (
                device,
                index,
              ) => ({
                deviceId:
                  device.deviceId,

                label:
                  device.label ||
                  `Camera ${index + 1}`,
              }),
            )

        setCameraDevices(
          cameras,
        )

        setSelectedCameraId(
          (current) => {
            if (
              current &&
              cameras.some(
                (
                  camera,
                ) =>
                  camera.deviceId ===
                  current,
              )
            ) {
              return current
            }

            return (
              cameras[0]
                ?.deviceId ||
              ''
            )
          },
        )
      } catch (error) {
        console.error(
          '[Anywear] Camera enumeration error:',
          error,
        )
      }
    }

  /* =======================================================
     RELEASE AI
     ======================================================= */

  const disconnectAi =
    () => {
      ++aiRequestIdRef.current

      if (
        realtimeClientRef.current
      ) {
        try {
          realtimeClientRef.current.disconnect()
        } catch {
          // Ignore cleanup errors.
        }
      }

      realtimeClientRef.current =
        null

      if (aiVideoRef.current) {
        aiVideoRef.current.pause()

        aiVideoRef.current.srcObject =
          null
      }

      setAiConnected(
        false,
      )

      setAiStatus(
        'idle',
      )

      setAiError('')
    }

  /* =======================================================
     RELEASE CAMERA
     ======================================================= */

  const releaseCamera = () => {
    if (
      cameraStreamRef.current
    ) {
      cameraStreamRef.current
        .getTracks()
        .forEach(
          (track) => {
            track.stop()
          },
        )

      cameraStreamRef.current =
        null
    }

    if (videoRef.current) {
      videoRef.current.pause()

      videoRef.current.srcObject =
        null
    }
  }

  /* =======================================================
     START CAMERA
     ======================================================= */

  const startCamera = async (
    requestedDeviceId?: string,
  ) => {
    if (
      cameraStatus ===
      'starting'
    ) {
      return
    }

    if (
      !navigator.mediaDevices ||
      !navigator.mediaDevices
        .getUserMedia
    ) {
      setCameraStatus(
        'error',
      )

      setCameraError(
        'Camera access is not supported in this browser.',
      )

      return
    }

    const requestId =
      ++cameraRequestIdRef.current

    try {
      setCameraStatus(
        'starting',
      )

      setCameraError('')

      disconnectAi()

      releaseCamera()

      const video =
        videoRef.current

      if (!video) {
        setCameraStatus(
          'error',
        )

        setCameraError(
          'Camera video element is unavailable.',
        )

        return
      }

      /*
        Use the model's official dimensions,
        but resolve its FPS definition into a
        numeric FPS value for MediaTrackConstraints.
      */

      const model =
        models.realtime(
          'lucy-vton-latest',
        )

      const captureFps =
        resolveFpsNumber(
          model.fps,
        )

      const captureWidth =
        model.width

      const captureHeight =
        model.height

      const selectedDeviceId =
        requestedDeviceId ||
        selectedCameraId

      const videoConstraints:
        MediaTrackConstraints =
        selectedDeviceId
          ? {
              deviceId: {
                exact:
                  selectedDeviceId,
              },

              width: {
                ideal:
                  captureWidth,
              },

              height: {
                ideal:
                  captureHeight,
              },

              frameRate: {
                ideal:
                  captureFps,
                max:
                  captureFps,
              },
            }
          : {
              facingMode:
                'user',

              width: {
                ideal:
                  captureWidth,
              },

              height: {
                ideal:
                  captureHeight,
              },

              frameRate: {
                ideal:
                  captureFps,
                max:
                  captureFps,
              },
            }

      const stream =
        await navigator.mediaDevices.getUserMedia(
          {
            video:
              videoConstraints,

            audio: false,
          },
        )

      if (
        requestId !==
        cameraRequestIdRef.current
      ) {
        stream
          .getTracks()
          .forEach(
            (track) => {
              track.stop()
            },
          )

        return
      }

      cameraStreamRef.current =
        stream

      video.srcObject =
        stream

      video.muted =
        true

      video.autoplay =
        true

      video.playsInline =
        true

      await video.play()

      const activeTrack =
        stream.getVideoTracks()[0]

      const activeDeviceId =
        activeTrack
          ?.getSettings()
          .deviceId

      if (
        activeDeviceId
      ) {
        setSelectedCameraId(
          activeDeviceId,
        )
      }

      await loadCameraDevices()

      setCameraStatus(
        'active',
      )
    } catch (error) {
      console.error(
        '[Anywear] Camera error:',
        error,
      )

      releaseCamera()

      setCameraStatus(
        'error',
      )

      if (
        error instanceof
        DOMException
      ) {
        switch (
          error.name
        ) {
          case 'NotAllowedError':
            setCameraError(
              'Camera permission was denied.',
            )
            break

          case 'NotFoundError':
            setCameraError(
              'No camera was found.',
            )
            break

          case 'NotReadableError':
            setCameraError(
              'The camera is already being used by another application.',
            )
            break

          case 'OverconstrainedError':
            setCameraError(
              'The selected camera does not support the requested settings.',
            )
            break

          case 'SecurityError':
            setCameraError(
              'The browser blocked camera access for security reasons.',
            )
            break

          default:
            setCameraError(
              error.message ||
                'Unable to access the camera.',
            )
        }
      } else {
        setCameraError(
          'Unable to start the camera.',
        )
      }
    }
  }

  /* =======================================================
     START CAMERA BUTTON
     ======================================================= */

  const handleStartCamera =
    () => {
      void startCamera()
    }

  /* =======================================================
     STOP CAMERA
     ======================================================= */

  const stopCamera =
    () => {
      ++cameraRequestIdRef.current

      disconnectAi()

      releaseCamera()

      setCameraStatus(
        'idle',
      )

      setCameraError('')
    }

  /* =======================================================
     START AI TRY-ON
     ======================================================= */

  const startAiTryOn =
    async () => {
      if (
        cameraStatus !==
          'active' ||
        !cameraStreamRef.current
      ) {
        setAiStatus(
          'error',
        )

        setAiError(
          'Start the camera before starting AI try-on.',
        )

        return
      }

      if (!garment) {
        setAiStatus(
          'error',
        )

        setAiError(
          'Select a garment before starting AI try-on.',
        )

        return
      }

      if (
        realtimeClientRef.current
      ) {
        await sendGarmentToAi()

        return
      }

      const requestId =
        ++aiRequestIdRef.current

      try {
        setAiStatus(
          'connecting',
        )

        setAiError('')

        const tokenResponse =
          await fetch(
            `${BACKEND_URL}/api/decart/token`,
            {
              method: 'POST',

              headers: {
                'Content-Type':
                  'application/json',
              },
            },
          )

        if (
          !tokenResponse.ok
        ) {
          const body =
            await tokenResponse
              .json()
              .catch(
                () => null,
              )

          throw new Error(
            body?.error ||
              `Token request failed with status ${tokenResponse.status}.`,
          )
        }

        const token =
          await tokenResponse.json()

        if (
          !token?.ok ||
          !token?.apiKey
        ) {
          throw new Error(
            token?.error ||
              'Backend returned an invalid Decart client token.',
          )
        }

        const decartClient =
          createDecartClient({
            apiKey:
              token.apiKey,
          })

        const model =
          models.realtime(
            'lucy-vton-latest',
          )

        const realtimeClient =
          await decartClient.realtime.connect(
            cameraStreamRef.current,
            {
              model,

              mirror: true,

              onRemoteStream:
                (
                  remoteStream,
                ) => {
                  if (
                    requestId !==
                    aiRequestIdRef.current
                  ) {
                    return
                  }

                  const aiVideo =
                    aiVideoRef.current

                  if (!aiVideo) {
                    return
                  }

                  aiVideo.srcObject =
                    remoteStream

                  aiVideo.muted =
                    true

                  aiVideo.autoplay =
                    true

                  aiVideo.playsInline =
                    true

                  void aiVideo.play()

                  setAiStatus(
                    'active',
                  )
                },
            },
          )

        if (
          requestId !==
          aiRequestIdRef.current
        ) {
          realtimeClient.disconnect()

          return
        }

        realtimeClientRef.current =
          realtimeClient

        setAiConnected(
          true,
        )
      } catch (error) {
        console.error(
          '[Anywear] Decart connection error:',
          error,
        )

        setAiConnected(
          false,
        )

        setAiStatus(
          'error',
        )

        setAiError(
          error instanceof
            Error
            ? error.message
            : 'Unable to connect to the AI try-on service.',
        )
      }
    }

  /* =======================================================
     SEND GARMENT TO AI
     ======================================================= */

  const sendGarmentToAi =
    async () => {
      const client =
        realtimeClientRef.current

      if (
        !client ||
        !garment
      ) {
        return
      }

      try {
        setAiError('')

        const garmentBlob =
          await getGarmentBlob(
            garment,
          )

        const prompt =
          `Substitute the current garment with the selected clothing item "${garment.name}", preserving the person's face, pose, body shape, lighting and background.`

        await client.setImage(
          garmentBlob,
          {
            prompt,
            enhance: true,
          },
        )

        setAiStatus(
          'active',
        )
      } catch (error) {
        console.error(
          '[Anywear] Garment AI error:',
          error,
        )

        setAiStatus(
          'error',
        )

        setAiError(
          error instanceof
            Error
            ? error.message
            : 'Unable to send the garment to the AI model.',
        )
      }
    }

  /* =======================================================
     SEND NEW GARMENT WHEN AI IS ACTIVE
     ======================================================= */

  useEffect(() => {
    if (
      !aiConnected ||
      !garment ||
      !realtimeClientRef.current
    ) {
      return
    }

    void sendGarmentToAi()
  }, [
    garment,
    aiConnected,
  ])

  /* =======================================================
     CAMERA SWITCH
     ======================================================= */

  const handleCameraChange =
    (
      event:
        React.ChangeEvent<HTMLSelectElement>,
    ) => {
      const deviceId =
        event.target.value

      setSelectedCameraId(
        deviceId,
      )

      void startCamera(
        deviceId,
      )
    }

  /* =======================================================
     DEVICE CHANGE
     ======================================================= */

  useEffect(() => {
    const handleDeviceChange =
      () => {
        void loadCameraDevices()
      }

    navigator.mediaDevices?.addEventListener(
      'devicechange',
      handleDeviceChange,
    )

    return () => {
      navigator.mediaDevices?.removeEventListener(
        'devicechange',
        handleDeviceChange,
      )
    }
  }, [])

  /* =======================================================
     PAGE MOUSE TRACKING
     ======================================================= */

  const handlePageMouseMove =
    (event: MouseEvent) => {
      const host =
        document.getElementById(
          HOST_ID,
        )

      if (
        host &&
        event
          .composedPath()
          .includes(host)
      ) {
        clearHighlightedImage()

        return
      }

      const image =
        getImageFromTarget(
          event.target,
        )

      if (
        !image ||
        !isUsableImage(image)
      ) {
        clearHighlightedImage()

        return
      }

      highlightImage(
        image,
      )
    }

  /* =======================================================
     PAGE CLICK
     ======================================================= */

  const handlePageClick =
    (event: MouseEvent) => {
      const host =
        document.getElementById(
          HOST_ID,
        )

      if (
        host &&
        event
          .composedPath()
          .includes(host)
      ) {
        return
      }

      const image =
        getImageFromTarget(
          event.target,
        )

      if (
        !image ||
        !isUsableImage(image)
      ) {
        return
      }

      event.preventDefault()
      event.stopPropagation()
      event.stopImmediatePropagation()

      const url =
        getImageUrl(image)

      if (!url) {
        return
      }

      setGarment({
        url,

        source:
          'page',

        name:
          getImageName(
            image,
          ),
      })

      stopPagePicker()
    }

  /* =======================================================
     STOP PAGE PICKER
     ======================================================= */

  const stopPagePicker =
    () => {
      setPickerActive(
        false,
      )

      document.body.style.cursor =
        ''

      clearHighlightedImage()

      removePickerBodyState()

      document.removeEventListener(
        'mousemove',
        handlePageMouseMove,
        true,
      )

      document.removeEventListener(
        'click',
        handlePageClick,
        true,
      )

      window.removeEventListener(
        'blur',
        clearHighlightedImage,
      )
    }

  /* =======================================================
     START PAGE PICKER
     ======================================================= */

  const startPagePicker =
    () => {
      if (pickerActive) {
        return
      }

      setOpen(true)

      setPickerActive(
        true,
      )

      installHighlightStyles()

      document.body.classList.add(
        PICKER_BODY_CLASS,
      )

      document.body.style.cursor =
        'crosshair'

      document.addEventListener(
        'mousemove',
        handlePageMouseMove,
        true,
      )

      document.addEventListener(
        'click',
        handlePageClick,
        true,
      )

      window.addEventListener(
        'blur',
        clearHighlightedImage,
      )
    }

  /* =======================================================
     FILE INPUT
     ======================================================= */

  const handleFileChange =
    (
      event:
        React.ChangeEvent<HTMLInputElement>,
    ) => {
      const file =
        event.target.files?.[0]

      if (
        !file ||
        !file.type.startsWith(
          'image/',
        )
      ) {
        return
      }

      if (
        objectUrlRef.current
      ) {
        URL.revokeObjectURL(
          objectUrlRef.current,
        )
      }

      const objectUrl =
        URL.createObjectURL(
          file,
        )

      objectUrlRef.current =
        objectUrl

      setGarment({
        url:
          objectUrl,

        source:
          'file',

        name:
          file.name,
      })

      event.target.value =
        ''
    }

  /* =======================================================
     DRAG & DROP
     ======================================================= */

  const handleDrop =
    (
      event:
        React.DragEvent<HTMLDivElement>,
    ) => {
      event.preventDefault()

      const file =
        event.dataTransfer
          .files?.[0]

      if (
        file &&
        file.type.startsWith(
          'image/',
        )
      ) {
        if (
          objectUrlRef.current
        ) {
          URL.revokeObjectURL(
            objectUrlRef.current,
          )
        }

        const objectUrl =
          URL.createObjectURL(
            file,
          )

        objectUrlRef.current =
          objectUrl

        setGarment({
          url:
            objectUrl,

          source:
            'drop',

          name:
            file.name,
        })

        return
      }

      const uri =
        event.dataTransfer.getData(
          'text/uri-list',
        ) ||
        event.dataTransfer.getData(
          'text/plain',
        )

      if (
        uri &&
        /^https?:\/\//i.test(
          uri,
        )
      ) {
        setGarment({
          url:
            uri,

          source:
            'drop',

          name:
            'Dropped product image',
        })
      }
    }

  const handleDragOver =
    (
      event:
        React.DragEvent<HTMLDivElement>,
    ) => {
      event.preventDefault()
    }

  /* =======================================================
     CLEAR GARMENT
     ======================================================= */

  const clearGarment =
    () => {
      setGarment(null)

      if (
        objectUrlRef.current
      ) {
        URL.revokeObjectURL(
          objectUrlRef.current,
        )

        objectUrlRef.current =
          null
      }

      if (
        realtimeClientRef.current
      ) {
        setAiError('')
        setAiStatus(
          'active',
        )
      }
    }

  /* =======================================================
     CLOSE
     ======================================================= */

  const closePanel = () => {
    stopPagePicker()

    stopCamera()

    setOpen(false)
  }

  /* =======================================================
     GLOBAL CLEANUP
     ======================================================= */

  useEffect(() => {
    return () => {
      ++cameraRequestIdRef.current
      ++aiRequestIdRef.current

      if (
        realtimeClientRef.current
      ) {
        try {
          realtimeClientRef.current.disconnect()
        } catch {
          // Ignore cleanup errors.
        }
      }

      realtimeClientRef.current =
        null

      if (
        cameraStreamRef.current
      ) {
        cameraStreamRef.current
          .getTracks()
          .forEach(
            (track) => {
              track.stop()
            },
          )
      }

      if (
        objectUrlRef.current
      ) {
        URL.revokeObjectURL(
          objectUrlRef.current,
        )
      }

      clearHighlightedImage()

      removePickerBodyState()

      document.body.style.cursor =
        ''
    }
  }, [])

  /* =======================================================
     UI
     ======================================================= */

  return (
    <>
      {!open && (
        <button
          className="try-on-button"
          onClick={() =>
            setOpen(true)
          }
          type="button"
        >
          ✨ Try On
        </button>
      )}

      {open && (
        <div
          className={`overlay ${
            pickerActive
              ? 'picker-mode'
              : ''
          }`}
        >
          <div className="fitting-room">

            {/* HEADER */}

            <div className="header">
              <div>
                <div className="brand">
                  ANYWEAR REPLICA
                </div>

                <div className="subtitle">
                  Live Virtual Try-On
                </div>
              </div>

              <button
                className="close-button"
                onClick={
                  closePanel
                }
                type="button"
                aria-label="Close"
              >
                ×
              </button>
            </div>

            {/* PICKER */}

            {pickerActive && (
              <div className="picker-banner">
                <span>👆</span>

                <div>
                  <strong>
                    Select a garment
                  </strong>

                  <small>
                    Hover over a product
                    image and click it
                  </small>
                </div>

                <button
                  className="cancel-picker"
                  type="button"
                  onClick={
                    stopPagePicker
                  }
                >
                  Cancel
                </button>
              </div>
            )}

            {/* CAMERA / AI PREVIEW */}

            <div className="preview">

              <video
                ref={videoRef}
                className="camera-video"
                autoPlay
                muted
                playsInline
                style={{
                  display:
                    aiStatus ===
                    'active'
                      ? 'none'
                      : cameraStatus ===
                          'active'
                        ? 'block'
                        : 'none',

                  transform:
                    mirrored
                      ? 'scaleX(-1)'
                      : 'scaleX(1)',
                }}
              />

              <video
                ref={aiVideoRef}
                className="ai-video"
                autoPlay
                muted
                playsInline
                style={{
                  display:
                    aiStatus ===
                    'active'
                      ? 'block'
                      : 'none',
                }}
              />

              {aiStatus ===
                'active' && (
                <div className="camera-live-badge ai-badge">
                  <span className="camera-live-dot" />
                  AI LIVE
                </div>
              )}

              {cameraStatus ===
                'active' &&
                aiStatus !==
                  'active' && (
                <div className="camera-live-badge">
                  <span className="camera-live-dot" />
                  CAMERA
                </div>
              )}

              {cameraStatus !==
                'active' && (
                <div className="camera-placeholder">

                  <div className="camera-icon">
                    ◉
                  </div>

                  <h2>
                    {cameraStatus ===
                    'starting'
                      ? 'Starting Camera...'
                      : 'Camera Preview'}
                  </h2>

                  <p>
                    {cameraStatus ===
                    'error'
                      ? cameraError
                      : 'Start your camera to begin the virtual try-on.'}
                  </p>

                  {cameraStatus !==
                    'starting' && (
                    <button
                      className="camera-start-button"
                      type="button"
                      onClick={
                        handleStartCamera
                      }
                    >
                      {cameraStatus ===
                      'error'
                        ? 'Try Again'
                        : 'Start Camera'}
                    </button>
                  )}

                </div>
              )}

            </div>

            {/* CAMERA CONTROLS */}

            {cameraStatus ===
              'active' && (
              <div className="camera-controls-row">

                {cameraDevices.length >
                  1 && (
                  <div className="camera-device-row">

                    <span className="camera-device-label">
                      Camera
                    </span>

                    <select
                      className="camera-select"
                      value={
                        selectedCameraId
                      }
                      onChange={
                        handleCameraChange
                      }
                    >
                      {cameraDevices.map(
                        (
                          device,
                        ) => (
                          <option
                            key={
                              device.deviceId
                            }
                            value={
                              device.deviceId
                            }
                          >
                            {
                              device.label
                            }
                          </option>
                        ),
                      )}
                    </select>

                  </div>
                )}

                <div className="camera-toolbar">

                  <button
                    className="camera-tool-button"
                    type="button"
                    onClick={() =>
                      setMirrored(
                        (
                          value,
                        ) =>
                          !value,
                      )
                    }
                    title={
                      mirrored
                        ? 'Turn mirror off'
                        : 'Turn mirror on'
                    }
                  >
                    ↔
                  </button>

                  <button
                    className="camera-tool-button stop"
                    type="button"
                    onClick={
                      stopCamera
                    }
                    title="Stop camera"
                  >
                    ■
                  </button>

                </div>

              </div>
            )}

            {/* GARMENT */}

            <div
              className="drop-zone"
              onDrop={
                handleDrop
              }
              onDragOver={
                handleDragOver
              }
            >
              <div className="upload-icon">
                👕
              </div>

              <strong>
                Drag a clothing image here
              </strong>

              <span>
                or choose one from the current
                webpage
              </span>

              <div className="action-row">

                <button
                  className="select-button"
                  type="button"
                  onClick={() =>
                    fileInputRef.current?.click()
                  }
                >
                  Select File
                </button>

                <button
                  className="page-button"
                  type="button"
                  onClick={
                    startPagePicker
                  }
                >
                  Pick From Page
                </button>

              </div>

              <input
                ref={
                  fileInputRef
                }
                type="file"
                accept="image/*"
                hidden
                onChange={
                  handleFileChange
                }
              />

            </div>

            {/* SELECTED GARMENT */}

            {garment && (
              <div className="selected-garment">

                <img
                  src={
                    garment.url
                  }
                  alt={
                    garment.name
                  }
                />

                <div className="selected-garment-info">

                  <strong>
                    Selected garment
                  </strong>

                  <span>
                    {
                      garment.name
                    }
                  </span>

                </div>

                <button
                  className="garment-remove-icon"
                  type="button"
                  onClick={
                    clearGarment
                  }
                  title="Remove garment"
                >
                  ×
                </button>

              </div>
            )}

            {/* AI ACTION */}

            {cameraStatus ===
              'active' &&
              garment && (
              <div className="ai-action">

                {aiStatus !==
                  'active' && (
                  <button
                    className="ai-start-button"
                    type="button"
                    disabled={
                      aiStatus ===
                      'connecting'
                    }
                    onClick={() =>
                      void startAiTryOn()
                    }
                  >
                    {aiStatus ===
                    'connecting'
                      ? 'Connecting AI...'
                      : aiStatus ===
                          'error'
                        ? 'Retry AI Try-On'
                        : '✨ Start AI Try-On'}
                  </button>
                )}

                {aiStatus ===
                  'active' && (
                  <button
                    className="ai-stop-button"
                    type="button"
                    onClick={
                      disconnectAi
                    }
                  >
                    ■ Stop AI Try-On
                  </button>
                )}

              </div>
            )}

            {/* AI ERROR */}

            {aiStatus ===
              'error' && (
              <div className="ai-error">
                <span>⚠</span>

                <span>
                  {aiError}
                </span>
              </div>
            )}

            {/* STATUS */}

            <div className="status">

              <span
                className={`status-dot ${
                  aiStatus ===
                  'active'
                    ? 'ai-status-dot'
                    : ''
                }`}
              />

              {aiStatus ===
              'active'
                ? 'AI try-on active • Live result'
                : aiStatus ===
                    'connecting'
                  ? 'Connecting to AI try-on...'
                  : cameraStatus ===
                      'active'
                    ? garment
                      ? 'Camera active • Garment ready'
                      : 'Camera active • Select a garment'
                    : pickerActive
                      ? 'Waiting for garment selection'
                      : garment
                        ? 'Garment ready for try-on'
                        : 'Ready for try-on'}

            </div>

          </div>
        </div>
      )}
    </>
  )
}