export type LeadType = "Buyer" | "Signal Observer" | "LLM Monitor" | "Unknown";

export type InterestType = {
  stripe: boolean;
  invoice: boolean;
  signalAccess: boolean;
  mirror: boolean;
};

export type FormData = {
  companyName: string;
  contactEmail: string;
  leadType: LeadType;
  artifact?: File | null;
  orderSize: number;
  interestType: InterestType;
  securePassphrase?: string;
  nodeReference?: string;
};

export type EventLog = {
  id: string;
  timestamp: string;
  eventType: string;
  data: Record<string, unknown>;
  metadata: {
    stripePaymentIntentId?: string;
    githubCommitSHA?: string;
    highPriority?: boolean;
    nodeReference?: string;
    gptClassification?: string;
    securityStatus?: SecurityStatus;
  };
};

export type EventFlags = {
  highSignal: boolean;
  needsMirror: boolean;
  artifactRejected: boolean;
  stripeConfirmed?: boolean;
  artifactLoaded?: boolean;
  highRisk?: boolean;
  gptClassified?: boolean;
};

export type AdminFilterOption =
  | "ALL"
  | "HIGH-RISK"
  | "ARTEFACT-LOADED"
  | "STRIPE-CONFIRMED"
  | "NEEDS-MIRROR"
  | "HIGH-SIGNAL";

export type SecurityStatus = "SECURED" | "UNSECURED" | "PASSPHRASE-PROTECTED";

export type ServiceResponse = {
  success: boolean;
  message: string;
  data?: Record<string, unknown>;
  error?: string;
};

export type StripeResponse = ServiceResponse & {
  data?: {
    paymentIntentId?: string;
    amount?: number;
    status?: string;
  };
};

export type GitHubResponse = ServiceResponse & {
  data?: {
    commitSHA?: string;
    repositoryUrl?: string;
    fileUrl?: string;
  };
};

export type OpenAIResponse = ServiceResponse & {
  data?: {
    classification?: string;
    confidenceScore?: number;
    analysis?: string;
  };
};
