import { useState, useEffect, useRef, useCallback } from 'react';

type InputFocus = 'EMAIL' | 'PASSWORD' | 'IDLE' | 'SUCCESS';

interface UseBearAnimationProps {
  watchBearImages: string[];
  hideBearImages: string[];
  peakBearImages: string[];
  emailLength: number;
  showPassword: boolean;
}

export function useBearAnimation({
  watchBearImages,
  hideBearImages,
  peakBearImages,
  emailLength,
  showPassword,
}: UseBearAnimationProps) {
  const [currentFocus, setCurrentFocus] = useState<InputFocus>('IDLE');
  const [currentBearImage, setCurrentBearImage] = useState<string | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const [isCelebrating, setIsCelebrating] = useState(false);

  const prevFocus = useRef<InputFocus>('IDLE');
  const prevShowPassword = useRef(showPassword);
  const timeouts = useRef<number[]>([]);

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      timeouts.current.forEach(clearTimeout);
    };
  }, []);

  const clearAllTimeouts = useCallback(() => {
    timeouts.current.forEach(clearTimeout);
    timeouts.current = [];
  }, []);

  const animateImages = useCallback((
    images: string[],
    interval: number,
    reverse = false,
    onComplete?: () => void,
  ) => {
    if (images.length === 0) {
      onComplete?.();
      return;
    }

    clearAllTimeouts();
    setIsAnimating(true);
    const imageSequence = reverse ? [...images].reverse() : images;

    imageSequence.forEach((img, index) => {
      const timeoutId = window.setTimeout(() => {
        setCurrentBearImage(img);
        if (index === imageSequence.length - 1) {
          setIsAnimating(false);
          onComplete?.();
        }
      }, index * interval);
      timeouts.current.push(timeoutId);
    });
  }, [clearAllTimeouts]);

  // Celebration animation - wave by cycling through peak images
  const playCelebration = useCallback(() => {
    if (peakBearImages.length === 0 || watchBearImages.length === 0) return;
    
    clearAllTimeouts();
    setIsCelebrating(true);
    setIsAnimating(true);

    // Create a waving sequence: show peek images back and forth 3 times
    const waveSequence = [
      ...peakBearImages,
      ...peakBearImages.slice().reverse(),
      ...peakBearImages,
      ...peakBearImages.slice().reverse(),
      ...peakBearImages,
    ];

    waveSequence.forEach((img, index) => {
      const timeoutId = window.setTimeout(() => {
        setCurrentBearImage(img);
        if (index === waveSequence.length - 1) {
          // End with happy watching pose
          const endTimeout = window.setTimeout(() => {
            setCurrentBearImage(watchBearImages[Math.floor(watchBearImages.length / 2)]);
            setIsAnimating(false);
            setIsCelebrating(false);
          }, 200);
          timeouts.current.push(endTimeout);
        }
      }, index * 80);
      timeouts.current.push(timeoutId);
    });
  }, [clearAllTimeouts, peakBearImages, watchBearImages]);

  // Update watching bear position based on email length
  const updateWatchingPosition = useCallback(() => {
    if (watchBearImages.length === 0) return;
    
    const progress = Math.min(emailLength / 30, 1);
    const index = Math.min(
      Math.floor(progress * (watchBearImages.length - 1)),
      watchBearImages.length - 1,
    );
    setCurrentBearImage(watchBearImages[Math.max(0, index)]);
    setIsAnimating(false);
  }, [emailLength, watchBearImages]);

  // Handle email length changes while in EMAIL focus
  useEffect(() => {
    if (currentFocus === 'EMAIL' && !isAnimating) {
      updateWatchingPosition();
    }
  }, [emailLength, currentFocus, isAnimating, updateWatchingPosition]);

  // Handle focus changes
  useEffect(() => {
    // Handle SUCCESS state
    if (currentFocus === 'SUCCESS' && prevFocus.current !== 'SUCCESS') {
      playCelebration();
      prevFocus.current = currentFocus;
      return;
    }

    // Skip if focus hasn't changed or if celebrating
    if (prevFocus.current === currentFocus && prevShowPassword.current === showPassword) {
      return;
    }

    if (isCelebrating) {
      return;
    }

    const wasFocusingPassword = prevFocus.current === 'PASSWORD';
    const isNowFocusingEmail = currentFocus === 'EMAIL';
    const isNowFocusingPassword = currentFocus === 'PASSWORD';

    if (isNowFocusingEmail) {
      if (wasFocusingPassword) {
        // Coming from password - reverse hide animation, then show watching
        animateImages(hideBearImages, 60, true, () => {
          updateWatchingPosition();
        });
      } else {
        // Coming from idle or initial - just show watching position
        updateWatchingPosition();
      }
    } else if (isNowFocusingPassword) {
      if (prevFocus.current !== 'PASSWORD') {
        // First time entering password field - animate to hide
        animateImages(hideBearImages, 40, false, () => {
          // After hiding, check if we need to peek
          if (showPassword) {
            animateImages(peakBearImages, 50);
          }
        });
      }
    } else if (currentFocus === 'IDLE') {
      // Return to neutral position
      if (wasFocusingPassword) {
        animateImages(hideBearImages, 60, true, () => {
          if (watchBearImages.length > 0) {
            setCurrentBearImage(watchBearImages[0]);
          }
        });
      } else if (watchBearImages.length > 0) {
        setCurrentBearImage(watchBearImages[0]);
      }
    }

    prevFocus.current = currentFocus;
  }, [currentFocus, animateImages, hideBearImages, peakBearImages, watchBearImages, updateWatchingPosition, showPassword, playCelebration, isCelebrating]);

  // Handle show/hide password toggle while in PASSWORD focus
  useEffect(() => {
    if (currentFocus !== 'PASSWORD') {
      prevShowPassword.current = showPassword;
      return;
    }

    if (showPassword !== prevShowPassword.current) {
      if (showPassword) {
        // Show password - peek through fingers
        animateImages(peakBearImages, 50);
      } else {
        // Hide password - cover eyes again
        animateImages(peakBearImages, 50, true);
      }
    }

    prevShowPassword.current = showPassword;
  }, [showPassword, currentFocus, animateImages, peakBearImages]);

  // Set initial image
  useEffect(() => {
    if (!currentBearImage && watchBearImages.length > 0) {
      setCurrentBearImage(watchBearImages[0]);
    }
  }, [watchBearImages, currentBearImage]);

  return {
    currentFocus,
    setCurrentFocus,
    currentBearImage: currentBearImage ?? (watchBearImages.length > 0 ? watchBearImages[0] : null),
    isAnimating,
    isCelebrating,
  };
}
