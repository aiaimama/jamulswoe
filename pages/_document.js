import { Html, Head, Main, NextScript } from 'next/document'
export default function Document() {
  return (
    <Html lang="ko">
      <Head>
        <title>자물쇠</title>
        <style>{`body { margin: 0; background: #fafafa; font-family: -apple-system, BlinkMacSystemFont, 'Apple SD Gothic Neo', 'Malgun Gothic', sans-serif; }`}</style>
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  )
}
