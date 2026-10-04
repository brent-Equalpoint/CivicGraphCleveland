/* v5.23 Section banners: a small illustrated header for each chapter of the Today screen (What's new, At City Hall, City Hall receipts, Close to home).
   Original drawings, made in the app's own colors through CSS variables, so they follow the style (Bento or Original) and the mode (dark or light) with no
   second copy. No text inside the pictures (so nothing needs translating) and no photo or outside file (so no license question). They are decoration: hidden
   from screen readers, with the real heading beside them. A little motion (a bobbing pin, a pulsing dot, a sliding ticker) that stops for anyone who has asked
   their device for less motion. */

function CxmBannerArt({ kind }) {
  if (kind === `hall`) {
    return (
      <>
        <g className="bn-dim">
          <rect className="bn-f4" x="238" y="80" width="22" height="46" rx="2" />
          <rect className="bn-f4" x="272" y="42" width="22" height="84" rx="2" />
          <rect className="bn-f4" x="276" y="30" width="14" height="14" rx="1" />
          <rect className="bn-f4" x="281" y="18" width="4" height="14" />
          <rect className="bn-f4" x="306" y="54" width="26" height="72" rx="2" />
          <polygon className="bn-f4" points="306,54 319,36 332,54" />
          <rect className="bn-f4" x="338" y="72" width="20" height="54" rx="2" />
        </g>
        <path className="bn-wave bn-wave-a" d="M0 128 q15 -6 30 0 t30 0 t30 0 t30 0 t30 0 t30 0 t30 0 t30 0 t30 0 t30 0 t30 0 t30 0 t30 0 V150 H0 Z" />
        <path className="bn-wave bn-wave-b" d="M0 136 q15 -5 30 0 t30 0 t30 0 t30 0 t30 0 t30 0 t30 0 t30 0 t30 0 t30 0 t30 0 t30 0 t30 0 V150 H0 Z" />
        <rect className="bn-f4" x="148" y="116" width="114" height="8" rx="2" />
        <rect className="bn-f2" x="156" y="86" width="98" height="30" rx="2" />
        <polygon className="bn-f1" points="152,86 205,62 258,86" />
        <rect className="bn-f1" x="194" y="54" width="22" height="8" rx="2" />
        <line className="bn-stroke" x1="205" y1="38" x2="205" y2="54" />
        <path className="bn-f5 bn-flag" d="M205 38 q10 -5 20 0 q-10 5 -20 10 Z" />
        {[0, 1, 2, 3, 4, 5, 6].map((i) => <rect key={i} className="bn-f3" x={163 + i * 13.5} y="90" width="6" height="26" rx="1" />)}
        <g className="bn-bob">
          <rect className="bn-f6x bn-frame" x="140" y="20" width="48" height="52" rx="9" />
          <path className="bn-f1" d="M140 29 a9 9 0 0 1 9 -9 h30 a9 9 0 0 1 9 9 v6 h-48 Z" />
          {[0, 1, 2].map((r) => [0, 1, 2].map((c) => <circle key={`${r}${c}`} className={r === 1 && c === 2 ? `bn-f5` : `bn-f3 bn-dim`} cx={152 + c * 14} cy={47 + r * 8} r="2.6" />))}
        </g>
        <circle className="bn-ring" cx="192" cy="22" r="5" />
        <circle className="bn-f5" cx="192" cy="22" r="4" />
      </>
    );
  }
  if (kind === `news`) {
    return (
      <>
        <rect className="bn-f4" x="186" y="24" width="124" height="88" rx="11" transform="rotate(-7 248 68)" />
        <rect className="bn-f6x" x="198" y="30" width="124" height="90" rx="11" transform="rotate(4 260 75)" />
        <rect className="bn-f6x bn-frame" x="208" y="28" width="128" height="96" rx="11" />
        <rect className="bn-f7" x="218" y="40" width="74" height="8" rx="4" />
        <rect className="bn-f3 bn-dim" x="218" y="56" width="108" height="5" rx="2.5" />
        <rect className="bn-f3 bn-dim" x="218" y="66" width="96" height="5" rx="2.5" />
        <rect className="bn-f1" x="218" y="82" width="44" height="30" rx="6" />
        <rect className="bn-f3 bn-dim" x="270" y="84" width="54" height="5" rx="2.5" />
        <rect className="bn-f3 bn-dim" x="270" y="94" width="42" height="5" rx="2.5" />
        <rect className="bn-f3 bn-dim" x="270" y="104" width="50" height="5" rx="2.5" />
        <rect className="bn-f5" x="298" y="36" width="30" height="14" rx="7" />
        <g className="bn-ticker">
          {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => <rect key={i} className={i % 3 === 0 ? `bn-f1` : `bn-f3 bn-dim`} x={140 + i * 34} y="134" width="22" height="5" rx="2.5" />)}
        </g>
        <circle className="bn-ring" cx="190" cy="24" r="5" />
        <circle className="bn-f5" cx="190" cy="24" r="4" />
      </>
    );
  }
  if (kind === `receipts`) {
    return (
      <>
        <path className="bn-f6x bn-frame" d="M196 16 h98 v104 l-8 -7 l-8 7 l-8 -7 l-8 7 l-8 -7 l-8 7 l-8 -7 l-8 7 l-8 -7 l-8 7 l-8 -7 l-8 7 Z" />
        {[0, 1, 2, 3].map((i) => (
          <g key={i}>
            <rect className="bn-f7" x="206" y={30 + i * 14} width={i % 2 ? 40 : 52} height="5" rx="2.5" />
            <rect className="bn-f3 bn-dim" x="262" y={30 + i * 14} width="22" height="5" rx="2.5" />
          </g>
        ))}
        <line className="bn-stroke bn-dash" x1="206" y1="88" x2="284" y2="88" />
        <rect className="bn-f1" x="206" y="96" width="34" height="7" rx="3.5" />
        <rect className="bn-f5" x="256" y="96" width="28" height="7" rx="3.5" />
        <g className="bn-stamp">
          <circle className="bn-stroke bn-teal" cx="304" cy="76" r="16" />
          <path className="bn-stroke bn-teal" d="M296 76 l6 6 l10 -12" />
        </g>
        <ellipse className="bn-f5" cx="160" cy="116" rx="18" ry="6" />
        <ellipse className="bn-f5 bn-dim" cx="160" cy="109" rx="18" ry="6" />
        <ellipse className="bn-f5" cx="160" cy="102" rx="18" ry="6" />
        <ellipse className="bn-f3" cx="160" cy="95" rx="18" ry="6" />
      </>
    );
  }
  return (   // home
    <>
      <path className="bn-stroke bn-dash bn-ward" d="M150 70 C170 30 250 24 320 48 C350 70 346 118 300 124 C240 134 170 132 150 100 Z" />
      <line className="bn-stroke" x1="140" y1="124" x2="352" y2="124" />
      <rect className="bn-f2" x="176" y="88" width="40" height="36" rx="2" />
      <polygon className="bn-f1" points="172,88 196,68 220,88" />
      <rect className="bn-f7" x="190" y="104" width="12" height="20" rx="2" />
      <rect className="bn-f4" x="228" y="80" width="36" height="44" rx="2" />
      <polygon className="bn-f5" points="224,80 246,62 268,80" />
      <rect className="bn-f3 bn-dim" x="236" y="90" width="9" height="9" rx="1" />
      <rect className="bn-f3 bn-dim" x="248" y="90" width="9" height="9" rx="1" />
      <rect className="bn-f6x" x="274" y="62" width="34" height="62" rx="2" />
      {[0, 1, 2, 3].map((r) => [0, 1].map((c) => <rect key={`${r}${c}`} className="bn-f3 bn-dim" x={280 + c * 14} y={70 + r * 12} width="8" height="7" rx="1" />))}
      <rect className="bn-f2" x="316" y="92" width="32" height="32" rx="2" />
      <polygon className="bn-f1" points="312,92 332,76 352,92" />
      <g className="bn-bob">
        <path className="bn-f1" d="M246 14 c-10 0 -16 8 -16 16 c0 12 16 28 16 28 s16 -16 16 -28 c0 -8 -6 -16 -16 -16 z" />
        <circle className="bn-f6x" cx="246" cy="30" r="6" />
      </g>
    </>
  );
}
/* kind: hall | news | receipts | home. kicker is the small line above, title is the heading (the dot is added), children sit under the title inside the banner. */
function CxmBanner({ kind, kicker, title, children, className = `` }) {
  return (
    <div className={`bn bn-${kind} ${className}`}>
      <svg className="bn-art" viewBox="0 0 360 150" preserveAspectRatio="xMaxYMid slice" aria-hidden="true" focusable="false"><CxmBannerArt kind={kind} /></svg>
      <div className="bn-copy">
        {kicker && <span className="cxm-kicker">{kicker}</span>}
        <h2 className="cxm-h2">{title}<span className="cxm-dot">.</span></h2>
        {children}
      </div>
    </div>
  );
}
