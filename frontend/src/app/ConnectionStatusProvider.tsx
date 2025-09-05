import { createContext, PropsWithChildren, useContext } from "react";
import { useAccount, useConfig } from "wagmi";

const Context = createContext({
  isConnectionSupported: false,
});

export const useConnectionStatus = () => useContext(Context);

export default function ConnectionStatusProvider(props: PropsWithChildren) {
  const { chainId } = useAccount();
  const config = useConfig();

  const isConnectionSupported = config.chains
    .map((c) => c.id)
    .includes(chainId ?? 0);

  return (
    <Context.Provider
      value={{
        isConnectionSupported,
      }}
    >
      {props.children}
    </Context.Provider>
  );
}
