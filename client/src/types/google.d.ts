// Google Identity Services types
declare global {
  interface Window {
    google: {
      accounts: {
        id: {
          initialize: (config: GoogleIdConfig) => void;
          prompt: (config?: PromptConfig) => void;
          renderButton: (parent: HTMLElement, options: ButtonConfig) => void;
          disableAutoSelect: () => void;
          storeCredential: (credential: CredentialRequest) => void;
          cancel: () => void;
          onGoogleLibraryLoad: (callback: () => void) => void;
          revoke: (hint: string, callback: (response: RevokeResponse) => void) => void;
        };
      };
    };
  }
}

interface GoogleIdConfig {
  client_id: string;
  callback: (credentialResponse: CredentialResponse) => void;
  auto_select?: boolean;
  cancel_on_tap_outside?: boolean;
  context?: 'signin' | 'signup' | 'use';
  itp_support?: boolean;
  use_fedcm_for_prompt?: boolean;
}

interface CredentialResponse {
  credential: string;
  select_by: 'auto' | 'user' | 'fedcm';
  client_id?: string;
}

interface PromptConfig {
  moment_callback?: (promptMoment: PromptMomentNotification) => void;
}

interface PromptMomentNotification {
  getMomentType: () => 'display' | 'skipped' | 'dismissed';
  getDismissedReason: () => 'credential_returned' | 'cancel_called' | 'flow_restarted' | 'tap_outside' | 'unknown_reason';
  getSkippedReason: () => 'auto_cancel' | 'user_cancel' | 'tap_outside' | 'issuing_failed' | 'unknown_reason';
  getNotDisplayedReason: () => 'browser_not_supported' | 'invalid_client' | 'missing_client_id' | 'opt_out_or_no_session' | 'secure_http_required' | 'suppressed_by_user' | 'unregistered_origin' | 'unknown_reason';
  isDisplayMoment: () => boolean;
  isDisplayed: () => boolean;
  isNotDisplayed: () => boolean;
  isSkippedMoment: () => boolean;
  isDismissedMoment: () => boolean;
}

interface ButtonConfig {
  type?: 'standard' | 'icon';
  theme?: 'outline' | 'filled_blue' | 'filled_black';
  size?: 'large' | 'medium' | 'small';
  text?: 'signin_with' | 'signup_with' | 'continue_with' | 'signin';
  shape?: 'rectangular' | 'pill' | 'circle' | 'square';
  logo_alignment?: 'left' | 'center';
  width?: string;
  locale?: string;
  click_listener?: () => void;
}

interface CredentialRequest {
  id: string;
  password: string;
}

interface RevokeResponse {
  successful: boolean;
  error?: string;
}

export {};