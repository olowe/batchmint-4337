"use client";
import batchMintTokenFactoryABI from "@/abis/BatchMintTokenFactory";
import useSmartAccount from "@/hooks/useSmartAccount";
import networkContractsConfig from "@/wallet/network-contracts.config";
import { createContext, PropsWithChildren, useContext, useState } from "react";
import { useAccount, usePublicClient } from "wagmi";
import { useConnectionStatus } from "./ConnectionStatusProvider";

interface ITokenCardItem {
  id: number;
  name: string;
  symbol: string;
  totalSupply: string;
}

interface IFormData {
  name: string;
  symbol: string;
  totalSupply: string;
}

interface ITokenFormContext {
  formData: IFormData;
  tokenPreview: ITokenCardItem[];
  isFormValid: boolean;
  isDeploying: boolean;
  isDeploymentEnabled: boolean;
  notification: string | null;
  updateFormData: (field: keyof IFormData, value: string) => void;
  clearForm: () => void;
  addToken: () => Promise<void>;
  formatNumber: (num: string) => string;
  removeTokenFromPreview: (id: number) => void;
  isDuplicateToken: () => boolean;
}

const Context = createContext<ITokenFormContext>({
  formData: { name: "", symbol: "", totalSupply: "" },
  tokenPreview: [],
  isFormValid: false,
  isDeploying: false,
  isDeploymentEnabled: false,
  notification: null,
  updateFormData: () => {},
  clearForm: () => {},
  addToken: async () => {},
  formatNumber: () => "",
  removeTokenFromPreview: () => {},
  isDuplicateToken: () => false,
});

export const useTokenFormProvider = () =>
  useContext<ITokenFormContext>(Context);

export default function TokenFormProvider(props: PropsWithChildren) {
  const { isConnected, chainId } = useAccount();
  const { isConnectionSupported } = useConnectionStatus();
  const smartAccountAddress = useSmartAccount();
  const publicClient = usePublicClient();

  const batchMintTokenFactory = isConnectionSupported
    ? networkContractsConfig[chainId as number].batchMintTokenFactory
    : undefined;

  const isDeploymentEnabled =
    isConnected && isConnectionSupported && !!batchMintTokenFactory;

  const [formData, setFormData] = useState({
    name: "",
    symbol: "",
    totalSupply: "",
  });

  const [notification, setNotification] = useState<string | null>(null);
  const [isDeploying, setIsDeploying] = useState(false);
  const [tokenPreview, setTokenPreview] = useState<ITokenCardItem[]>([]);

  const isDuplicateToken = (): boolean => {
    return tokenPreview.some(
      (token) =>
        token.name.toLowerCase() === formData.name.trim().toLowerCase() &&
        token.symbol.toLowerCase() === formData.symbol.trim().toLowerCase()
    );
  };

  const isFormValid =
    !!formData.name.trim() &&
    !!formData.symbol.trim() &&
    !!formData.totalSupply.trim() &&
    Number(formData.totalSupply) > 0 &&
    !isDuplicateToken();

  const addToken = async (): Promise<void> => {
    if (!isFormValid) return;

    setNotification(null);

    const isDeployed = await checkIfTokenIsDeployed();
    if (isDeployed) {
      setNotification("This token has already been deployed.");
      return;
    }

    const newToken: ITokenCardItem = {
      id: tokenPreview.length,
      name: formData.name,
      symbol: formData.symbol,
      totalSupply: formData.totalSupply,
    };

    setTokenPreview([newToken, ...tokenPreview]);
    setFormData({ name: "", symbol: "", totalSupply: "" });
  };

  const removeTokenFromPreview = (id: number) => {
    setTokenPreview(tokenPreview.filter((token) => token.id !== id));
  };

  const updateFormData = (field: keyof IFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const clearForm = () => {
    setTokenPreview([]);
    setFormData({ name: "", symbol: "", totalSupply: "" });
    setNotification(null);
  };

  const checkIfTokenIsDeployed = async (): Promise<boolean> => {
    if (!publicClient || !smartAccountAddress || !batchMintTokenFactory) {
      return false;
    }

    return await publicClient.readContract({
      address: batchMintTokenFactory,
      abi: batchMintTokenFactoryABI,
      functionName: "getUserToken",
      args: [smartAccountAddress, formData.name, formData.symbol],
    });
  };

  const formatNumber = (num: string): any => {
    if (!num) return "";

    return Number(num).toLocaleString(undefined, {
      minimumFractionDigits: 0,
      maximumFractionDigits: 6,
    });
  };

  return (
    <Context.Provider
      value={{
        formData,
        tokenPreview,
        isFormValid,
        updateFormData,
        clearForm,
        addToken,
        isDeploying,
        formatNumber,
        removeTokenFromPreview,
        isDuplicateToken,
        isDeploymentEnabled,
        notification,
      }}
    >
      {props.children}
    </Context.Provider>
  );
}
