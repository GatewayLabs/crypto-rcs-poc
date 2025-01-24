export default function Footer() {
  return (
    <footer className="flex w-full items-center justify-between text-[11px] text-white font-normal text-center max-md:max-w-full pt-12 relative">
      <img
        loading="lazy"
        src="gateway-logo.svg"
        className="object-contain self-stretch my-auto"
        alt="Left Logo"
      />
      <p>Built on the first L1 to unify public and private state</p>
      <img
        loading="lazy"
        src="icons/footer-img.svg"
        className="object-contain self-stretch my-auto"
        alt="Right Logo"
      />
    </footer>
  );
}
