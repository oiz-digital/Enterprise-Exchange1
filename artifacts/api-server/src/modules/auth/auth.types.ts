export type RegisterInput = {
  email?: string;
  mobile?: string;
  password: string;
  referralCode?: string;
};

export type LoginInput = {
  identifier: string;
  password: string;
};

export type RefreshInput = {
  refreshToken: string;
};

export type AuthTokens = {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
};

export type AuthResponse = {
  user: {
    id: string;
    email: string | null;
    mobile: string | null;
    status: string;
  };
  tokens: AuthTokens;
};
