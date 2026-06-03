// pages/_app.js
import Head from 'next/head';

export default function App({ Component, pageProps }) {
  return (
    <>
      <Head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+Tamil:wght@400;500;600;700&family=Noto+Serif+Tamil:wght@400;600;700&family=Lora:ital,wght@0,600;1,400&family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
      </Head>
      <style global jsx>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        :root {
          --cream: #FAF6EF; --deep: #1C1208; --gold: #C8922A;
          --gold-light: #E8B355; --card-bg: #FFF8EE; --border: #E8D5B0; --text-muted: #7A6645;
          /* Singer colours */
          --male-bg: #EEF4FF; --male-border: #93B4F8; --male-label: #1E4DB7;
          --female-bg: #FFF0F6; --female-border: #F4A0C0; --female-label: #B72160;
          --chorus-bg: #F3FFF0; --chorus-border: #7EC87A; --chorus-label: #276024;
          /* Admin palette */
          --admin-bg: #0F1117; --admin-surface: #1A1E2E; --admin-border: #2D3748;
          --admin-text: #E2E8F0; --admin-muted: #64748B; --admin-accent: #6C8EFF;
          --success: #34D399; --error: #FC8181; --warn: #FBBF24;
        }
        body { background: var(--cream); color: var(--deep); font-family: 'Inter', sans-serif; }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        .spinner { width: 18px; height: 18px; border: 2px solid rgba(255,255,255,0.3); border-top-color: #fff; border-radius: 50%; animation: spin 0.7s linear infinite; display: inline-block; }
        .spinner-dark { border-color: rgba(0,0,0,0.15); border-top-color: var(--deep); }
      `}</style>
      <Component {...pageProps} />
    </>
  );
}
