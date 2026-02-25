import { useState } from 'react';
import { FaInfoCircle } from 'react-icons/fa';

const Tooltip = ({ children, text, position = 'top' }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const triggerRef = useState(null);

  const handleMouseEnter = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setCoords({
      top: rect.top,
      left: rect.left,
      width: rect.width,
      height: rect.height
    });
    setIsVisible(true);
  };

  const getTooltipPosition = () => {
    if (!coords.top) return {};
    
    const offset = 8;
    switch(position) {
      case 'top':
        return {
          top: coords.top - offset,
          left: coords.left + coords.width / 2,
          transform: 'translate(-50%, -100%)'
        };
      case 'bottom':
        return {
          top: coords.top + coords.height + offset,
          left: coords.left + coords.width / 2,
          transform: 'translateX(-50%)'
        };
      case 'left':
        return {
          top: coords.top + coords.height / 2,
          left: coords.left - offset,
          transform: 'translate(-100%, -50%)'
        };
      case 'right':
        return {
          top: coords.top + coords.height / 2,
          left: coords.left + coords.width + offset,
          transform: 'translateY(-50%)'
        };
      default:
        return {};
    }
  };

  return (
    <>
      <div className="relative inline-block">
        <div
          onMouseEnter={handleMouseEnter}
          onMouseLeave={() => setIsVisible(false)}
          className="cursor-help"
        >
          {children}
        </div>
      </div>
      {isVisible && (
        <div
          className="fixed z-[9999] px-3 py-2 text-sm text-white bg-gray-900 rounded-lg shadow-xl max-w-xs pointer-events-none"
          style={{ ...getTooltipPosition(), whiteSpace: 'normal' }}
        >
          {text}
        </div>
      )}
    </>
  );
};

const TooltipIcon = ({ text, position = 'top' }) => {
  return (
    <Tooltip text={text} position={position}>
      <FaInfoCircle className="text-gray-400 hover:text-tescha-blue transition-colors" />
    </Tooltip>
  );
};

export { Tooltip, TooltipIcon };
export default Tooltip;
