import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { X, Check, RefreshCw } from 'lucide-react';
import { createAvatar } from '@dicebear/core';
import { avataaars } from '@dicebear/collection';
import { Button } from './ui/button';

interface AvatarBuilderModalProps {
  onClose: () => void;
  onSave: (avatarFile: File) => void;
  initialSeed?: string;
}

const SKIN_COLORS = ['tanned', 'yellow', 'pale', 'light', 'brown', 'darkBrown', 'black'];
const TOP_STYLES = [
  'noHair', 'eyepatch', 'hat', 'hijab', 'turban', 'winterHat1', 'winterHat2', 'winterHat3', 'winterHat4',
  'longHairBigHair', 'longHairBob', 'longHairBun', 'longHairCurly', 'longHairCurvy', 'longHairDreads',
  'longHairFrida', 'longHairFro', 'longHairFroBand', 'longHairNotTooLong', 'longHairShavedSides',
  'longHairMiaWallace', 'longHairStraight', 'longHairStraight2', 'longHairStraightStrand',
  'shortHairDreads01', 'shortHairDreads02', 'shortHairFrizzle', 'shortHairShaggyMullet',
  'shortHairShortCurly', 'shortHairShortFlat', 'shortHairShortRound', 'shortHairShortWaved',
  'shortHairSides', 'shortHairTheCaesar', 'shortHairTheCaesarSidePart'
];
const FACIAL_HAIR_STYLES = ['blank', 'beardMedium', 'beardLight', 'beardMajestic', 'moustaceMagnum', 'moustaceFancy'];
const CLOTHING_STYLES = ['blazerShirt', 'blazerSweater', 'collarSweater', 'graphicShirt', 'hoodie', 'overall', 'shirtCrewNeck', 'shirtScoopNeck', 'shirtVNeck'];
const ACCESSORIES = ['blank', 'kurt', 'prescription01', 'prescription02', 'round', 'sunglasses', 'wayfarers'];

export function AvatarBuilderModal({ onClose, onSave, initialSeed = 'user' }: AvatarBuilderModalProps) {
  const [seed, setSeed] = useState(initialSeed);
  const [skinColor, setSkinColor] = useState('light');
  const [top, setTop] = useState('shortHairShortFlat');
  const [facialHair, setFacialHair] = useState('blank');
  const [clothing, setClothing] = useState('hoodie');
  const [accessories, setAccessories] = useState('blank');
  
  const [avatarSvg, setAvatarSvg] = useState('');

  useEffect(() => {
    const avatar = createAvatar(avataaars, {
      seed,
      skinColor: [skinColor],
      top: [top],
      facialHair: [facialHair],
      clothing: [clothing],
      accessories: [accessories],
      eyes: ['happy'],
      mouth: ['smile'],
      backgroundColor: ['e0b596', 'c69472', 'f5f5f5', 'd1d5db'],
      backgroundType: ['solid'],
    });
    setAvatarSvg(avatar.toString());
  }, [seed, skinColor, top, facialHair, clothing, accessories]);

  const handleSave = () => {
    // Convert SVG string to Blob
    const blob = new Blob([avatarSvg], { type: 'image/svg+xml' });
    const file = new File([blob], `avatar_${Date.now()}.svg`, { type: 'image/svg+xml' });
    onSave(file);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className="fixed inset-0 z-[70] bg-black/50 backdrop-blur-sm flex flex-col items-center justify-end md:justify-center md:p-6"
    >
      <div className="w-full max-h-[90dvh] h-full max-w-4xl mx-auto flex flex-col rounded-t-3xl md:rounded-2xl border-t md:border border-gray-200 dark:border-white/[0.08] overflow-hidden bg-gray-50 dark:bg-[#111] shadow-2xl">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-white dark:bg-[#0a0a0a] border-b border-gray-200 dark:border-white/[0.08]">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Create Avatar</h2>
          <button onClick={onClose} className="p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-white/[0.08] rounded-full transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto flex flex-col md:flex-row p-6 gap-8 pb-32 md:pb-6">
          
          {/* Preview Panel */}
          <div className="flex-shrink-0 flex flex-col items-center gap-4 md:w-1/3">
            <div 
              className="w-48 h-48 md:w-64 md:h-64 rounded-full overflow-hidden shadow-2xl bg-white border-4 border-[#e0b596]"
              dangerouslySetInnerHTML={{ __html: avatarSvg }}
            />
            <Button 
              variant="outline" 
              onClick={() => setSeed(Math.random().toString(36).substring(7))}
              className="flex items-center gap-2 w-full max-w-[200px]"
            >
              <RefreshCw className="w-4 h-4" /> Randomize Colors
            </Button>
          </div>

          {/* Controls Panel */}
          <div className="flex-1 space-y-6">
            <div className="space-y-3">
              <label className="text-sm font-bold text-gray-700 dark:text-gray-300">Skin Tone</label>
              <select 
                value={skinColor} 
                onChange={(e) => setSkinColor(e.target.value)}
                className="w-full p-3 rounded-xl border border-gray-200 dark:border-white/[0.1] bg-white dark:bg-[#1f1f1f] text-gray-900 dark:text-white"
              >
                {SKIN_COLORS.map(c => <option key={c} value={c}>{c.replace(/([A-Z])/g, ' $1').trim()}</option>)}
              </select>
            </div>

            <div className="space-y-3">
              <label className="text-sm font-bold text-gray-700 dark:text-gray-300">Hairstyle</label>
              <select 
                value={top} 
                onChange={(e) => setTop(e.target.value)}
                className="w-full p-3 rounded-xl border border-gray-200 dark:border-white/[0.1] bg-white dark:bg-[#1f1f1f] text-gray-900 dark:text-white"
              >
                {TOP_STYLES.map(c => <option key={c} value={c}>{c.replace(/([A-Z])/g, ' $1').trim()}</option>)}
              </select>
            </div>

            <div className="space-y-3">
              <label className="text-sm font-bold text-gray-700 dark:text-gray-300">Facial Hair</label>
              <select 
                value={facialHair} 
                onChange={(e) => setFacialHair(e.target.value)}
                className="w-full p-3 rounded-xl border border-gray-200 dark:border-white/[0.1] bg-white dark:bg-[#1f1f1f] text-gray-900 dark:text-white"
              >
                {FACIAL_HAIR_STYLES.map(c => <option key={c} value={c}>{c.replace(/([A-Z])/g, ' $1').trim()}</option>)}
              </select>
            </div>

            <div className="space-y-3">
              <label className="text-sm font-bold text-gray-700 dark:text-gray-300">Clothing</label>
              <select 
                value={clothing} 
                onChange={(e) => setClothing(e.target.value)}
                className="w-full p-3 rounded-xl border border-gray-200 dark:border-white/[0.1] bg-white dark:bg-[#1f1f1f] text-gray-900 dark:text-white"
              >
                {CLOTHING_STYLES.map(c => <option key={c} value={c}>{c.replace(/([A-Z])/g, ' $1').trim()}</option>)}
              </select>
            </div>

            <div className="space-y-3">
              <label className="text-sm font-bold text-gray-700 dark:text-gray-300">Accessories</label>
              <select 
                value={accessories} 
                onChange={(e) => setAccessories(e.target.value)}
                className="w-full p-3 rounded-xl border border-gray-200 dark:border-white/[0.1] bg-white dark:bg-[#1f1f1f] text-gray-900 dark:text-white"
              >
                {ACCESSORIES.map(c => <option key={c} value={c}>{c.replace(/([A-Z])/g, ' $1').trim()}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-white dark:bg-[#0a0a0a] border-t border-gray-200 dark:border-white/[0.08] flex justify-end gap-3 pb-safe">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} className="bg-[#e0b596] hover:bg-[#c69472] text-white">
            <Check className="w-4 h-4 mr-2" /> Save Avatar
          </Button>
        </div>

      </div>
    </motion.div>
  );
}
