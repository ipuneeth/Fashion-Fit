type FetchImageMessage = {
  type: 'ANYWEAR_FETCH_IMAGE'
  url: string
}

type FetchImageResponse = {
  ok: boolean
  dataUrl?: string
  error?: string
}

/* =========================================================
   ARRAY BUFFER → BASE64
   ========================================================= */

function arrayBufferToBase64(
  buffer: ArrayBuffer,
): string {
  const bytes =
    new Uint8Array(buffer)

  const chunkSize = 0x8000

  let binary = ''

  for (
    let offset = 0;
    offset < bytes.length;
    offset += chunkSize
  ) {
    const chunk =
      bytes.subarray(
        offset,
        Math.min(
          offset +
            chunkSize,
          bytes.length,
        ),
      )

    binary += String.fromCharCode(
      ...chunk,
    )
  }

  return btoa(binary)
}

/* =========================================================
   FETCH RETAILER IMAGE
   ========================================================= */

async function fetchRetailerImage(
  url: string,
): Promise<FetchImageResponse> {
  try {
    let parsedUrl: URL

    try {
      parsedUrl =
        new URL(url)
    } catch {
      return {
        ok: false,
        error:
          'Invalid garment image URL.',
      }
    }

    if (
      parsedUrl.protocol !==
        'http:' &&
      parsedUrl.protocol !==
        'https:'
    ) {
      return {
        ok: false,
        error:
          'Only HTTP and HTTPS image URLs are supported.',
      }
    }

    const response =
      await fetch(
        parsedUrl.toString(),
        {
          method: 'GET',
          redirect: 'follow',
          credentials:
            'omit',
          cache: 'force-cache',
        },
      )

    if (!response.ok) {
      return {
        ok: false,
        error:
          `Image request failed with status ${response.status}.`,
      }
    }

    const contentType =
      response.headers.get(
        'content-type',
      ) ||
      'image/jpeg'

    if (
      !contentType.startsWith(
        'image/',
      )
    ) {
      return {
        ok: false,
        error:
          'The selected URL did not return an image.',
      }
    }

    const buffer =
      await response.arrayBuffer()

    if (!buffer.byteLength) {
      return {
        ok: false,
        error:
          'The garment image is empty.',
      }
    }

    const base64 =
      arrayBufferToBase64(
        buffer,
      )

    const dataUrl =
      `data:${contentType};base64,${base64}`

    return {
      ok: true,
      dataUrl,
    }
  } catch (error) {
    console.error(
      '[Anywear] Image fetch error:',
      error,
    )

    return {
      ok: false,
      error:
        'Unable to retrieve the garment image.',
    }
  }
}

/* =========================================================
   MESSAGE HANDLER
   ========================================================= */

chrome.runtime.onMessage.addListener(
  (
    message: FetchImageMessage,
    _sender,
    sendResponse,
  ) => {
    if (
      message?.type !==
      'ANYWEAR_FETCH_IMAGE'
    ) {
      return false
    }

    void fetchRetailerImage(
      message.url,
    ).then(
      (response) => {
        sendResponse(
          response,
        )
      },
    )

    return true
  },
)