import React, { useState } from 'react';
import { Merchant } from '@/app/types';
import { MapPin, Phone, Globe, Star, ShoppingBag, Clock, Edit, Trash, Check, X, Shield, PhoneForwarded } from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import { API_BASE_URL } from '@/app/api';

interface MerchantCardProps {
    merchant: Merchant;
    isAdminView?: boolean;
    onApprove?: (id: number) => void;
    onReject?: (id: number) => void;
    onFeature?: (id: number, isFeatured: boolean) => void;
    onEdit?: (merchant: Merchant) => void;
    onDelete?: (id: number) => void;
}

export function MerchantCard({ merchant, isAdminView, onApprove, onReject, onFeature, onEdit, onDelete }: MerchantCardProps) {
    const [showContactModal, setShowContactModal] = useState(false);
    const logoUrl = merchant.logoUrl ? (merchant.logoUrl.startsWith('http') ? merchant.logoUrl : `${API_BASE_URL}${merchant.logoUrl}`) : null;

    const statusColors = {
        PENDING: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-500',
        APPROVED: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-500',
        REJECTED: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-500',
        SUSPENDED: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400',
    };

    return (
        <div className={`relative bg-white dark:bg-[#252525] rounded-xl border ${merchant.isFeatured ? 'border-[#e0b596] shadow-sm shadow-[#e0b596]/20' : 'border-gray-200 dark:border-gray-800'} overflow-hidden flex flex-col transition-all hover:shadow-md`}>
            {merchant.isFeatured && (
                <div className="absolute top-0 right-0 bg-[#e0b596] text-white text-[10px] font-bold px-3 py-1 rounded-bl-lg z-10 flex items-center gap-1">
                    <Star className="w-3 h-3 fill-current" /> FEATURED
                </div>
            )}
            
            <div className="p-5 flex-1">
                <div className="flex gap-4 items-start">
                    {/* Logo */}
                    <div className="w-16 h-16 rounded-xl bg-gray-100 dark:bg-[#333] border border-gray-200 dark:border-[#444] flex-shrink-0 overflow-hidden flex items-center justify-center text-gray-400">
                        {logoUrl ? (
                            <img src={logoUrl} alt={merchant.businessName} className="w-full h-full object-cover" />
                        ) : (
                            <ShoppingBag className="w-8 h-8 opacity-50" />
                        )}
                    </div>
                    
                    {/* Info */}
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold text-gray-900 dark:text-gray-100 truncate text-lg">{merchant.businessName}</h3>
                            {isAdminView && (
                                <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${statusColors[merchant.status]}`}>
                                    {merchant.status}
                                </span>
                            )}
                        </div>
                        <div className="text-xs font-medium text-[#e0b596] mb-2">{merchant.category}</div>
                        
                        <div className="space-y-1.5 mt-3">
                            <div className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400">
                                <MapPin className="w-4 h-4 flex-shrink-0 mt-0.5" />
                                <span className="line-clamp-2">{merchant.location}</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                                <Phone className="w-4 h-4 flex-shrink-0" />
                                <span>{merchant.phone}</span>
                            </div>
                            {merchant.website && (
                                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                                    <Globe className="w-4 h-4 flex-shrink-0" />
                                    <a href={merchant.website.startsWith('http') ? merchant.website : `https://${merchant.website}`} target="_blank" rel="noreferrer" className="text-blue-500 hover:underline truncate">
                                        {merchant.website.replace(/^https?:\/\//, '')}
                                    </a>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
                
                {merchant.description && (
                    <div className="mt-4 text-sm text-gray-600 dark:text-gray-400 line-clamp-3">
                        {merchant.description}
                    </div>
                )}
                
                {/* Badges */}
                <div className="flex flex-wrap gap-2 mt-4">
                    {merchant.deliveryAvailable && (
                        <span className="text-[10px] bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 px-2 py-1 rounded border border-blue-100 dark:border-blue-900/30">
                            Delivery Available
                        </span>
                    )}
                    {merchant.onlineServiceAvailable && (
                        <span className="text-[10px] bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 px-2 py-1 rounded border border-purple-100 dark:border-purple-900/30">
                            Online Service
                        </span>
                    )}
                </div>
            </div>

            {/* Actions */}
            <div className="border-t border-gray-100 dark:border-gray-800/60 p-3 bg-gray-50/50 dark:bg-[#202020] flex gap-2 justify-end">
                {isAdminView ? (
                    <>
                        {merchant.status === 'PENDING' && (
                            <>
                                <Button variant="outline" size="sm" onClick={() => onApprove?.(merchant.id)} className="h-8 text-green-600 hover:text-green-700 hover:bg-green-50">
                                    <Check className="w-4 h-4 mr-1" /> Approve
                                </Button>
                                <Button variant="outline" size="sm" onClick={() => onReject?.(merchant.id)} className="h-8 text-red-600 hover:text-red-700 hover:bg-red-50">
                                    <X className="w-4 h-4 mr-1" /> Reject
                                </Button>
                            </>
                        )}
                        {merchant.status === 'APPROVED' && (
                            <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={() => onFeature?.(merchant.id, !merchant.isFeatured)} 
                                className={`h-8 ${merchant.isFeatured ? 'text-gray-500' : 'text-[#e0b596] hover:bg-[#e0b596]/10'}`}
                            >
                                <Star className={`w-4 h-4 mr-1 ${merchant.isFeatured ? 'fill-current' : ''}`} /> 
                                {merchant.isFeatured ? 'Unfeature' : 'Feature'}
                            </Button>
                        )}
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500" onClick={() => onDelete?.(merchant.id)}>
                            <Trash className="w-4 h-4" />
                        </Button>
                    </>
                ) : (
                    <>
                        <Button variant="default" size="sm" className="h-8 bg-[#e0b596] hover:bg-[#cda283] text-white" onClick={() => setShowContactModal(true)}>
                            Contact
                        </Button>
                    </>
                )}
            </div>

            {/* Custom Contact Modal */}
            {showContactModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
                    <div className="bg-white dark:bg-[#1b1b1b] rounded-xl shadow-xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="p-4 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center bg-gray-50 dark:bg-[#202020]">
                            <h3 className="font-semibold text-lg text-gray-900 dark:text-gray-100">Contact Options</h3>
                            <button onClick={() => setShowContactModal(false)} className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors bg-white dark:bg-[#2a2a2a] rounded-full p-1 border border-gray-200 dark:border-gray-700">
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                        <div className="p-5 space-y-3">
                            <a href={`tel:${merchant.phone}`} className="flex items-center gap-4 p-3 rounded-xl border border-gray-100 dark:border-gray-800 hover:bg-blue-50 dark:hover:bg-blue-900/10 hover:border-blue-200 dark:hover:border-blue-900/30 transition-all group">
                                <div className="p-2.5 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full group-hover:scale-110 transition-transform">
                                    <Phone className="w-5 h-5" />
                                </div>
                                <div>
                                    <div className="font-semibold text-gray-900 dark:text-gray-100">Call Mobile</div>
                                    <div className="text-sm text-gray-500 dark:text-gray-400">{merchant.phone}</div>
                                </div>
                            </a>
                            
                            {merchant.whatsappNumber && (
                                <a href={`https://wa.me/${merchant.whatsappNumber.replace(/[^0-9]/g, '')}`} target="_blank" rel="noreferrer" className="flex items-center gap-4 p-3 rounded-xl border border-gray-100 dark:border-gray-800 hover:bg-green-50 dark:hover:bg-green-900/10 hover:border-green-200 dark:hover:border-green-900/30 transition-all group">
                                    <div className="p-2.5 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-full group-hover:scale-110 transition-transform">
                                        <PhoneForwarded className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <div className="font-semibold text-gray-900 dark:text-gray-100">WhatsApp</div>
                                        <div className="text-sm text-gray-500 dark:text-gray-400">{merchant.whatsappNumber}</div>
                                    </div>
                                </a>
                            )}

                            {merchant.website && (
                                <a href={merchant.website.startsWith('http') ? merchant.website : `https://${merchant.website}`} target="_blank" rel="noreferrer" className="flex items-center gap-4 p-3 rounded-xl border border-gray-100 dark:border-gray-800 hover:bg-purple-50 dark:hover:bg-purple-900/10 hover:border-purple-200 dark:hover:border-purple-900/30 transition-all group">
                                    <div className="p-2.5 bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-full group-hover:scale-110 transition-transform">
                                        <Globe className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <div className="font-semibold text-gray-900 dark:text-gray-100">Visit Website</div>
                                        <div className="text-sm text-gray-500 dark:text-gray-400 truncate max-w-[200px]">{merchant.website.replace(/^https?:\/\//, '')}</div>
                                    </div>
                                </a>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
