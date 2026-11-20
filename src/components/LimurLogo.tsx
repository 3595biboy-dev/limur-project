import React from 'react';

export const LimurLogo: React.FC = () => {
  return (
    <a
      href="https://limurproject.ru/"
      target="_blank"
      rel="noopener noreferrer"
      className="group inline-flex items-center gap-3.5 shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B8956A] rounded-lg py-1 pr-2 transition-opacity hover:opacity-90"
      title="Перейти на сайт студии LimurProject"
    >
      <svg
        width="44"
        height="44"
        viewBox="0 0 44 44"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="shrink-0"
        aria-hidden="true"
      >
        <rect width="44" height="44" rx="8" fill="#1F1D1A" />
        {/* Architectural floorplan perimeter with doorway gap */}
        <path
          d="M9 17V9H35V35H20"
          stroke="#B8956A"
          strokeWidth="1.5"
          strokeLinecap="square"
        />
        <path
          d="M9 27V35H14"
          stroke="#B8956A"
          strokeWidth="1.5"
          strokeLinecap="square"
        />
        {/* Internal architectural partition tick & door swing arc */}
        <path
          d="M9 17H13.5"
          stroke="#B8956A"
          strokeWidth="1.2"
          strokeLinecap="square"
        />
        <path
          d="M14 35C14 31.6863 16.6863 29 20 29V35"
          stroke="#B8956A"
          strokeWidth="1"
          strokeOpacity="0.6"
        />
        {/* LP Monogram */}
        <text
          x="22.5"
          y="26"
          textAnchor="middle"
          fill="#FAF8F5"
          fontFamily="Cormorant Garamond, Georgia, serif"
          fontWeight="700"
          fontSize="15.5"
          letterSpacing="0.06em"
        >
          LP
        </text>
      </svg>

      <div className="flex flex-col leading-none">
        <span className="font-serif-display text-[24px] font-bold tracking-tight text-[#1F1D1A] whitespace-nowrap">
          LimurProject
        </span>
        <span className="mt-1 text-[10px] font-medium uppercase tracking-[0.22em] text-[#7A736A] whitespace-nowrap">
          дизайн интерьеров
        </span>
      </div>
    </a>
  );
};
