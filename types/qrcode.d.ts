declare module 'qrcode' {
  export type QrOptions = {
    width?: number
    margin?: number
    color?: {
      dark?: string
      light?: string
    }
  }

  const QRCode: {
    toDataURL(input: string, options?: QrOptions): Promise<string>
  }

  export default QRCode
}
