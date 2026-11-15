import React from "react";

export default function Icon2Gis({ size = 16, className = "" }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`gis-icon ${className}`}
      aria-hidden="true"
      style={{ verticalAlign: "middle", flexShrink: 0, borderRadius: "4px" }}
    >
      <rect width="24" height="24" rx="5" fill="#00B956" />
      <path
        d="M7 8.5C7 6.57 8.57 5 10.5 5H13.5C15.43 5 17 6.57 17 8.5C17 9.88 16.2 11.07 15.03 11.64L10.8 14.2H17V17H7V14.5L12.5 11.2C13.33 10.7 13.8 9.8 13.8 8.8C13.8 7.7 12.9 6.8 11.8 6.8H10.5C9.4 6.8 8.5 7.7 8.5 8.8V9.5H7V8.5Z"
        fill="#FFFFFF"
      />
    </svg>
  );
}
