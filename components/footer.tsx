"use client";

export default function Footer() {
  return (
    <footer className="flex w-full md:items-center justify-between text-[11px] text-white font-normal md:text-center max-md:max-w-full pt-12 relative max-md:flex-col max-md:gap-4">
      <div className="flex gap-2 items-center">
        Powered by
        <img
          loading="lazy"
          src="gateway-logo.svg"
          className="object-contain self-stretch my-auto max-md:w-[100px] ml-1"
          alt="Left Logo"
        />
      </div>
      <img
        loading="lazy"
        src="icons/footer-img.svg"
        className="object-contain self-stretch my-auto max-md:hidden"
        alt="Right Logo"
      />
    </footer>
  );
}
