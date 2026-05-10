import { memo, useEffect } from 'react';
import { useBearImages } from '@/hooks/useBearImages';
import { useBearAnimation } from '@/hooks/useBearAnimation';

interface BearMascotProps {
  emailFocused: boolean;
  passwordFocused: boolean;
  showPassword: boolean;
  emailLength: number;
  loginSuccess?: boolean;
}

interface BearAvatarProps {
  currentImage: string;
  size?: number;
  isCelebrating?: boolean;
}

const BearAvatar = memo(function BearAvatar({ currentImage, size = 130, isCelebrating = false }: BearAvatarProps) {
  return (
    <img
      src={currentImage}
      className={`rounded-full transition-all duration-200 ease-in-out ${
        isCelebrating ? 'animate-bounce' : ''
      }`}
      width={size}
      height={size}
      style={{
        objectFit: 'contain',
        transform: 'translate3d(0,0,0)', // Force GPU acceleration
      }}
      tabIndex={-1}
      alt="Animated bear avatar"
    />
  );
});

const BearMascot = ({ 
  emailFocused, 
  passwordFocused, 
  showPassword, 
  emailLength,
  loginSuccess = false,
}: BearMascotProps) => {
  const { watchBearImages, hideBearImages, peakBearImages } = useBearImages();
  const {
    currentBearImage,
    setCurrentFocus,
    isCelebrating,
  } = useBearAnimation({
    watchBearImages,
    hideBearImages,
    peakBearImages,
    emailLength,
    showPassword,
  });

  // Update focus based on props using useEffect
  useEffect(() => {
    if (loginSuccess) {
      setCurrentFocus('SUCCESS');
    } else if (emailFocused) {
      setCurrentFocus('EMAIL');
    } else if (passwordFocused) {
      setCurrentFocus('PASSWORD');
    } else {
      setCurrentFocus('IDLE');
    }
  }, [emailFocused, passwordFocused, loginSuccess, setCurrentFocus]);

  return (
    <div className={`w-[130px] h-[130px] relative mx-auto mb-4 ${isCelebrating ? 'scale-110' : ''} transition-transform duration-300`}>
      {/* Celebration effects */}
      {isCelebrating && (
        <>
          <div className="absolute -top-2 -left-2 text-2xl animate-ping">🎉</div>
          <div className="absolute -top-2 -right-2 text-2xl animate-ping" style={{ animationDelay: '0.1s' }}>✨</div>
          <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 text-2xl animate-ping" style={{ animationDelay: '0.2s' }}>🎊</div>
        </>
      )}
      <div className="absolute inset-0 flex items-center justify-center">
        {currentBearImage && (
          <BearAvatar
            currentImage={currentBearImage}
            isCelebrating={isCelebrating}
          />
        )}
      </div>
    </div>
  );
};

export default BearMascot;
