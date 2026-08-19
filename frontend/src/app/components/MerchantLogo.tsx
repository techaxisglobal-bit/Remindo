import React, { useState } from 'react';
import { Store } from 'lucide-react';
import { API_BASE_URL } from '@/app/api';

interface MerchantLogoProps {
    url?: string | null;
    name: string;
    className?: string;
    iconClassName?: string;
    initialsClassName?: string;
    objectFit?: 'contain' | 'cover';
}

export const MerchantLogo: React.FC<MerchantLogoProps> = ({ 
    url, 
    name, 
    className = "", 
    iconClassName = "w-1/2 h-1/2 mb-0.5 opacity-40",
    initialsClassName = "text-[10px] font-bold tracking-widest",
    objectFit = "contain"
}) => {
    const [imgError, setImgError] = useState(false);
    
    // Construct valid URL ensuring the correct backend API host is used
    const getLogoUrl = (rawUrl?: string | null) => {
        if (!rawUrl) return null;
        if (rawUrl.startsWith('http')) return rawUrl;
        // Strip leading slash if present to avoid double slashes if API_BASE_URL has a trailing slash
        const cleanUrl = rawUrl.startsWith('/') ? rawUrl.slice(1) : rawUrl;
        const baseUrl = API_BASE_URL.endsWith('/') ? API_BASE_URL : `${API_BASE_URL}/`;
        return `${baseUrl}${cleanUrl}`;
    };

    const finalUrl = getLogoUrl(url);
    const initials = name ? name.substring(0, 2).toUpperCase() : 'ST';

    if (!finalUrl || imgError) {
        return (
            <div className={`flex flex-col items-center justify-center bg-gray-100 dark:bg-black text-gray-500 dark:text-gray-400 w-full h-full p-1 ${className}`}>
                <Store className={iconClassName} />
                <span className={initialsClassName}>{initials}</span>
            </div>
        );
    }

    return (
        <img 
            src={finalUrl} 
            alt={name} 
            loading="lazy"
            onError={() => setImgError(true)}
            className={`w-full h-full object-${objectFit} ${className}`} 
        />
    );
};
