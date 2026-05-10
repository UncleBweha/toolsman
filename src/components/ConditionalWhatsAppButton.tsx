import { useLocation } from 'react-router-dom';
import FloatingWhatsAppButton from './FloatingWhatsAppButton';

interface ConditionalWhatsAppButtonProps {
  phoneNumber?: string;
  message?: string;
}

const ConditionalWhatsAppButton = (props: ConditionalWhatsAppButtonProps) => {
  const location = useLocation();
  
  // Hide on admin routes
  if (location.pathname.startsWith('/admin')) {
    return null;
  }
  
  return <FloatingWhatsAppButton {...props} />;
};

export default ConditionalWhatsAppButton;
