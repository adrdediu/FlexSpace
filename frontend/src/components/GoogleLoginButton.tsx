import React from 'react';
import { GoogleLogin } from '@react-oauth/google';

interface GoogleLoginButtonProps {
  onSuccess?: () => void;
  onError?: () => void;
}

export const GoogleLoginButton: React.FC<GoogleLoginButtonProps> = ({
  onSuccess,
  onError,
}) => {
  const handleSuccess = async (credentialResponse: any) => {
    try {
      const response = await fetch('/auth/google/callback/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          credential: credentialResponse.credential,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        console.log('Google login successful:', data);
        
        // Reload to trigger auth context update
        window.location.href = '/';
        
        if (onSuccess) onSuccess();
      } else {
        const error = await response.json();
        console.error('Google login failed:', error);
        if (onError) onError();
      }
    } catch (error) {
      console.error('Error during Google login:', error);
      if (onError) onError();
    }
  };

  const handleError = () => {
    console.error('Google login failed');
    if (onError) onError();
  };

  return (
    <GoogleLogin
      onSuccess={handleSuccess}
      onError={handleError}
    />
  );
};