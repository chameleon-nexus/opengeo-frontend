
import React from 'react';
import { RiFlashlightFill, RiPlayCircleLine, RiRobotLine, RiEditBoxLine } from 'react-icons/ri';
import { BsPlayCircle } from 'react-icons/bs';
import { BiCheckCircle } from 'react-icons/bi';
import { MdHighQuality } from 'react-icons/md';
import { PiImage } from 'react-icons/pi';
import { GoArrowUpRight } from 'react-icons/go';

const iconMap: { [key: string]: React.ComponentType<any> } = {
  RiFlashlightFill,
  RiPlayCircleLine,
  RiRobotLine,
  RiEditBoxLine,
  BsPlayCircle,
  BiCheckCircle,
  MdHighQuality,
  PiImage,
  GoArrowUpRight,
};

interface IconProps {
  name: string;
  className?: string;
  onClick?: () => void;
}

const Icon: React.FC<IconProps> = ({ name, className = "", onClick }) => {
  const IconComponent = iconMap[name];
  if (!IconComponent) return null;

  return (
    <IconComponent
      className={`${className} ${onClick ? 'cursor-pointer' : ''}`}
      onClick={onClick}
    />
  );
};

export default Icon;
