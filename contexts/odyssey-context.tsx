import {
  createContext,
  PropsWithChildren,
  useContext,
  useEffect,
  useState,
} from "react";

const OdysseyContext = createContext<boolean>(false);

export default function OdysseyContextProvider({
  children,
}: PropsWithChildren) {
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    window.parent.postMessage({ type: "DAPP_MOUNTED" }, "*");

    const messageEvent = (event: MessageEvent<{
        type: "DAPP_CONNECT_WALLET";
        data: { key: string; value: string | null }[];
      }>) => {
      if (event.data?.type === "DAPP_CONNECT_WALLET") {
        setIsConnected(true);
        event.data.data.forEach((item) => {
          if (item.value === null) return;
          localStorage.setItem(item.key, item.value);
        });
      }
    };

    window.addEventListener("message", messageEvent, false);

    return () => {
      window.removeEventListener("message", messageEvent, false);
    };
  }, []);

  return (
    <OdysseyContext.Provider value={isConnected}>
      {children}
    </OdysseyContext.Provider>
  );
}

export function useOdyssey() {
  return useContext(OdysseyContext);
}
