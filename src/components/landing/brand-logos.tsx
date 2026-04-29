import type { ReactElement } from "react";

type LogoProps = { className?: string };

export function GoogleAnalyticsLogo({ className }: LogoProps): ReactElement {
  return (
    <svg viewBox="0 0 192 192" className={className} xmlns="http://www.w3.org/2000/svg">
      <path fill="#F9AB00" d="M130 28v130c0 14.5 10 22.7 20.6 22.7 9.8 0 20.6-6.9 20.6-22.7V29c0-13.3-9.8-21.6-20.6-21.6S130 16.7 130 28z"/>
      <path fill="#E37400" d="M75.5 96v62c0 14.5 10 22.7 20.6 22.7 9.8 0 20.6-6.9 20.6-22.7V97c0-13.3-9.8-21.6-20.6-21.6S75.5 84.7 75.5 96z"/>
      <circle fill="#E37400" cx="41.6" cy="160" r="20.6"/>
    </svg>
  );
}

export function GoogleSearchConsoleLogo({ className }: LogoProps): ReactElement {
  return (
    <svg viewBox="0 0 64 64" className={className} xmlns="http://www.w3.org/2000/svg">
      <rect x="44" y="14" width="10" height="32" rx="5" fill="#4285F4"/>
      <rect x="32" y="22" width="10" height="24" rx="5" fill="#34A853"/>
      <rect x="20" y="30" width="10" height="16" rx="5" fill="#EA4335"/>
      <circle cx="22" cy="38" r="9" fill="none" stroke="#FBBC04" strokeWidth="4"/>
      <rect x="9" y="46" width="11" height="4" rx="2" transform="rotate(-45 9 46)" fill="#FBBC04"/>
    </svg>
  );
}

export function GoogleAdsLogo({ className }: LogoProps): ReactElement {
  return (
    <svg viewBox="0 0 192 192" className={className} xmlns="http://www.w3.org/2000/svg">
      <path fill="#FBBC04" d="M75.5 12.5 9.6 126.6c-7 12-2.7 27.5 9.5 34.5 12 7 27.5 2.7 34.5-9.5L119.5 37.5c7-12 2.7-27.5-9.5-34.5-12-7-27.5-2.7-34.5 9.5z"/>
      <path fill="#4285F4" d="m116.5 12.5 65.9 114c7 12 2.7 27.5-9.5 34.5-12 7-27.5 2.7-34.5-9.5L72.5 37.5c-7-12-2.7-27.5 9.5-34.5 12-7 27.5-2.7 34.5 9.5z"/>
      <circle fill="#34A853" cx="34.4" cy="146.4" r="25.4"/>
    </svg>
  );
}

export function MetaLogo({ className }: LogoProps): ReactElement {
  return (
    <svg viewBox="0 0 64 40" className={className} xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="meta-grad" x1="0" y1="20" x2="64" y2="20" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#0081FB"/>
          <stop offset=".5" stopColor="#0064E1"/>
          <stop offset="1" stopColor="#0082FB"/>
        </linearGradient>
      </defs>
      <path
        fill="url(#meta-grad)"
        d="M14.4 4C7.3 4 2 11.6 2 20.4c0 8.5 4.4 14.6 10.7 14.6 4.5 0 7.8-2.1 13.6-12.3 0 0 2.5-4.4 4.2-7.4 .6 1 1.3 2.1 2 3.3l3 5c5.8 9.7 9.1 11.4 13 11.4 6.4 0 9.9-5.2 9.9-13.5C58.4 12.4 52.4 4 44.7 4c-4.1 0-7.2 3.1-10.7 8-1.1 1.5-2.2 3.2-3.4 5.1-1.5-2.4-2.7-4.2-3.7-5.5C23.5 6.7 20.1 4 14.4 4Zm.2 6.1c3.5 0 5.7 1.6 9.1 6.5 .6 .9 1.4 2 2.2 3.3-.9 1.3-1.7 2.6-2.5 3.8-3.7 5.6-5.5 6.9-8.2 6.9-3.4 0-6.5-3.5-6.5-10.1 0-6.6 3-10.4 5.9-10.4Zm30 0c3.5 0 6.4 4.4 6.4 10.5 0 6-2 9.4-5.4 9.4-2.7 0-4.5-1.4-8.4-7.5-.7-1.1-1.5-2.4-2.4-3.8 1-1.6 1.9-3.1 2.7-4.3C40.7 11 42.6 10.1 44.6 10.1Z"
      />
    </svg>
  );
}

export function GoogleBusinessLogo({ className }: LogoProps): ReactElement {
  return (
    <svg viewBox="0 0 64 64" className={className} xmlns="http://www.w3.org/2000/svg">
      <path fill="#669DF6" d="M8 16h48l-4 12H12z"/>
      <path fill="#AECBFA" d="M8 16h12l-2 12H12z"/>
      <path fill="#AECBFA" d="M32 16h12l-2 12H30z"/>
      <rect x="12" y="28" width="40" height="24" rx="2" fill="#4285F4"/>
      <circle cx="32" cy="40" r="7" fill="none" stroke="#fff" strokeWidth="2.5"/>
      <path d="M32 40h5" stroke="#fff" strokeWidth="2.5" strokeLinecap="square"/>
      <path d="M37 40v3" stroke="#fff" strokeWidth="2.5" strokeLinecap="square"/>
    </svg>
  );
}

export function LinkedInLogo({ className }: LogoProps): ReactElement {
  return (
    <svg viewBox="0 0 48 48" className={className} xmlns="http://www.w3.org/2000/svg">
      <rect width="48" height="48" rx="8" fill="#0A66C2"/>
      <path fill="#fff" d="M14.5 18.5h5.6v18.6h-5.6V18.5zm2.8-8.6c1.8 0 3.2 1.5 3.2 3.2 0 1.8-1.5 3.2-3.2 3.2-1.8 0-3.2-1.5-3.2-3.2 0-1.8 1.5-3.2 3.2-3.2zM23.7 18.5h5.4v2.5h.1c.7-1.4 2.6-2.9 5.3-2.9 5.6 0 6.7 3.7 6.7 8.6v10.4H35.6V27.7c0-2.1 0-4.7-2.9-4.7-2.9 0-3.4 2.3-3.4 4.6v9.5h-5.6V18.5z"/>
    </svg>
  );
}

export function TikTokLogo({ className }: LogoProps): ReactElement {
  return (
    <svg viewBox="0 0 48 48" className={className} xmlns="http://www.w3.org/2000/svg">
      <rect width="48" height="48" rx="10" fill="#000"/>
      <path fill="#fff" d="M31.5 17.5c-1.6-1-2.8-2.6-3.3-4.5h-3.5v17.6c0 2-1.6 3.7-3.7 3.7-2 0-3.7-1.6-3.7-3.7s1.6-3.7 3.7-3.7c.4 0 .8.1 1.2.2v-3.6c-.4 0-.8-.1-1.2-.1-4 0-7.3 3.3-7.3 7.3s3.3 7.3 7.3 7.3 7.3-3.3 7.3-7.3v-9c1.5 1 3.3 1.6 5.2 1.6v-3.6c-.7-.1-1.4-.1-2-.2z"/>
    </svg>
  );
}

export function ShopifyLogo({ className }: LogoProps): ReactElement {
  return (
    <svg viewBox="0 0 109 124" className={className} xmlns="http://www.w3.org/2000/svg">
      <path fill="#95BF47" d="M74.7 14.8c-.1-.5-.5-.8-.9-.9-.4 0-7.7-.6-7.7-.6S60 7.4 59.4 6.7c-.6-.6-1.7-.4-2.2-.3-.1 0-1.2.4-3 .9C52.5 3 49.4 0 44.5 0h-.4c-1.4-1.8-3.1-2.6-4.6-2.6C28.1-2.6 22.5 11.5 20.7 18.7c-4.3 1.3-7.4 2.3-7.8 2.4-2.4.8-2.5.8-2.8 3.1C9.9 25.9 3.6 74.7 3.6 74.7L52.7 84l26.6-5.8s-4.5-46.6-4.6-63.4zM52 11.6c-1.4.4-3 .9-4.7 1.5v-1c0-3.1-.4-5.7-1.1-7.7 2.6.4 4.3 3.3 5.8 7.2zM43.1 5.3c.8 2.1 1.3 5.1 1.3 9.1v.5c-3 .9-6.3 1.9-9.6 3 1.9-7.1 5.4-10.6 8.3-12.6zm-3.7-3.5c.5 0 1 .2 1.5.5-3.8 1.8-7.9 6.3-9.6 15.4l-7.6 2.3c2-7 6.7-18.2 15.7-18.2z"/>
      <path fill="#5E8E3E" d="M73.8 13.9c-.4 0-7.7-.6-7.7-.6S60 7.4 59.4 6.7c-.2-.2-.5-.3-.8-.4l-3.7 89.8 24.4-5.3S74.8 14.7 74.7 14.8c-.1-.5-.5-.8-.9-.9z"/>
      <path fill="#fff" d="m44.5 27.4-3 8.9s-2.6-1.4-5.9-1.4c-4.7 0-5 3-5 3.7 0 4.1 10.7 5.7 10.7 15.3 0 7.6-4.8 12.4-11.3 12.4-7.7 0-11.7-4.8-11.7-4.8l2.1-6.8s4.1 3.5 7.5 3.5c2.2 0 3.2-1.8 3.2-3.1 0-5.4-8.8-5.6-8.8-14.4 0-7.4 5.3-14.6 16.1-14.6 4.1 0 6.1 1.3 6.1 1.3z"/>
    </svg>
  );
}

export function MatomoLogo({ className }: LogoProps): ReactElement {
  return (
    <svg viewBox="0 0 64 64" className={className} xmlns="http://www.w3.org/2000/svg">
      <circle cx="20" cy="40" r="14" fill="#3152A0"/>
      <circle cx="44" cy="40" r="14" fill="#F38334"/>
      <circle cx="32" cy="22" r="14" fill="#F9C32B"/>
    </svg>
  );
}

export function YouTubeLogo({ className }: LogoProps): ReactElement {
  return (
    <svg viewBox="0 0 48 48" className={className} xmlns="http://www.w3.org/2000/svg">
      <rect x="4" y="11" width="40" height="26" rx="6" fill="#FF0000"/>
      <path fill="#fff" d="M20 18v12l10-6z"/>
    </svg>
  );
}

export function ExcelLogo({ className }: LogoProps): ReactElement {
  return (
    <svg viewBox="0 0 48 48" className={className} xmlns="http://www.w3.org/2000/svg">
      <path fill="#185C37" d="M30 6 6 10v28l24 4V6z"/>
      <path fill="#21A366" d="M30 14h12v8H30z"/>
      <path fill="#107C41" d="M30 22h12v8H30z"/>
      <path fill="#33C481" d="M30 30h12v8H30z"/>
      <rect x="30" y="6" width="12" height="8" fill="#33C481"/>
      <path fill="#107C41" d="M6 10h24v28H6z" opacity=".15"/>
      <path fill="#fff" d="m11 16 4 8-4 8h3l2.5-5.2L19 32h3l-4-8 4-8h-3l-2.5 5L14 16z"/>
    </svg>
  );
}
