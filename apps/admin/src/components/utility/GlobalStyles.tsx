import React from "react";

const GlobalStyles: React.FC = () => (
    <style>{`
      .animation-delay-2s {
        animation-delay: 2s;
      }
      .animation-delay-4s {
        animation-delay: 4s;
      }
      .animation-delay-300 { animation-delay: 0.3s; opacity: 0; animation-fill-mode: forwards; }
      .animation-delay-600 { animation-delay: 0.6s; opacity: 0; animation-fill-mode: forwards; }
      .animation-delay-900 { animation-delay: 0.9s; opacity: 0; animation-fill-mode: forwards; }
    `}</style>
);

export default GlobalStyles;