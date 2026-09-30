import React, { useState } from 'react';
import { Button, ButtonProps } from './button';
import { Loader2 } from 'lucide-react';
import { Haptics, ImpactStyle } from '@capacitor/haptics';

interface AsyncButtonProps extends Omit<ButtonProps, 'onClick'> {
  onClick: (e: React.MouseEvent<HTMLButtonElement>) => Promise<void> | void;
  loadingText?: string;
  hapticStyle?: ImpactStyle;
}

export const AsyncButton: React.FC<AsyncButtonProps> = ({ 
  onClick, 
  children, 
  loadingText = 'Saving...', 
  hapticStyle = ImpactStyle.Light,
  disabled,
  ...props 
}) => {
  const [isSaving, setIsSaving] = useState(false);

  const handleClick = async (e: React.MouseEvent<HTMLButtonElement>) => {
    if (isSaving || disabled) return;
    
    // Provide instant haptic feedback
    try {
      await Haptics.impact({ style: hapticStyle });
    } catch (err) {
      // Ignore if haptics not available (e.g. web)
    }

    setIsSaving(true);
    try {
      await onClick(e);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Button
      {...props}
      onClick={handleClick}
      disabled={isSaving || disabled}
      className={`${props.className || ''} relative active:scale-95 transition-all duration-150`}
    >
      {isSaving ? (
        <span className="flex items-center justify-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin" />
          {loadingText}
        </span>
      ) : (
        children
      )}
    </Button>
  );
};
