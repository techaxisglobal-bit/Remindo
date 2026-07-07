import React, { useState, useEffect, useMemo } from 'react';
import { API_BASE_URL } from '@/app/api';
import { Merchant } from '@/app/types';
import { 
    Loader2, ShieldCheck, Store, Clock, XCircle, Star, 
    Search, Filter, Phone, Mail, Globe, MapPin, 
    Check, X, Trash2, Edit3, Eye, Calendar, ArrowRight,
    Briefcase, Image as ImageIcon, Map, RotateCw
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';

// Simple tooltip component inline to avoid extra dependencies if not available
const Tooltip = ({ children, content }: { children: React.ReactNode, content: string }) => {
    return (
        <div className="group relative inline-flex">
            {children}
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-[10px] font-bold rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
                {content}
                <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900" />
            </div>
        </div>
    );
};

export function MerchantAdmin() {
    const [merchants, setMerchants] = useState<Merchant[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    
    // Filters
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('ALL');
    const [categoryFilter, setCategoryFilter] = useState('ALL');
    
    // Selected Merchant for Drawer
    const [selectedMerchant, setSelectedMerchant] = useState<Merchant | null>(null);

    const fetchMerchants = async () => {
        setIsLoading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${API_BASE_URL}/api/merchants/admin`, {
                headers: { 'x-auth-token': token || '' }
            });
            if (res.ok) {
                const data = await res.json();
                setMerchants(data);
            }
        } catch (error) {
            console.error('Failed to fetch merchants:', error);
            toast.error('Failed to load merchants');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchMerchants();
    }, []);

    const updateStatus = async (id: number, status: string) => {
        const actionName = status === 'APPROVED' ? 'approve' : 'reject';
        if (status === 'REJECTED' && !window.confirm('Are you sure you want to reject this merchant?')) return;

        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${API_BASE_URL}/api/merchants/${id}/status`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'x-auth-token': token || ''
                },
                body: JSON.stringify({ status })
            });

            if (res.ok) {
                toast.success(`Merchant marked as ${status.toLowerCase()}`);
                // Optimistic update
                setMerchants(prev => prev.map(m => m.id === id ? { ...m, status } : m));
                if (selectedMerchant?.id === id) {
                    setSelectedMerchant(prev => prev ? { ...prev, status } : null);
                }
            } else {
                toast.error(`Failed to ${actionName} merchant`);
            }
        } catch (error) {
            toast.error(`Error updating status`);
        }
    };

    const toggleFeature = async (id: number, currentFeatured: boolean) => {
        const isFeatured = !currentFeatured;
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${API_BASE_URL}/api/merchants/${id}/status`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'x-auth-token': token || ''
                },
                body: JSON.stringify({ isFeatured })
            });

            if (res.ok) {
                toast.success(isFeatured ? 'Merchant featured!' : 'Removed from featured');
                // Optimistic update
                setMerchants(prev => prev.map(m => m.id === id ? { ...m, isFeatured } : m));
                if (selectedMerchant?.id === id) {
                    setSelectedMerchant(prev => prev ? { ...prev, isFeatured } : null);
                }
            } else {
                toast.error('Failed to update feature status');
            }
        } catch (error) {
            toast.error('Error updating feature status');
        }
    };

    const deleteMerchant = async (id: number) => {
        if (!window.confirm('Are you sure you want to permanently delete this listing? This cannot be undone.')) return;
        
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${API_BASE_URL}/api/merchants/${id}`, {
                method: 'DELETE',
                headers: { 'x-auth-token': token || '' }
            });

            if (res.ok) {
                toast.success('Merchant deleted successfully');
                setMerchants(prev => prev.filter(m => m.id !== id));
                if (selectedMerchant?.id === id) {
                    setSelectedMerchant(null);
                }
            } else {
                toast.error('Failed to delete merchant');
            }
        } catch (error) {
            toast.error('Error deleting merchant');
        }
    };

    // Derived stats
    const stats = useMemo(() => {
        return {
            total: merchants.length,
            pending: merchants.filter(m => m.status === 'PENDING').length,
            approved: merchants.filter(m => m.status === 'APPROVED').length,
            rejected: merchants.filter(m => m.status === 'REJECTED').length,
            featured: merchants.filter(m => m.isFeatured).length,
        };
    }, [merchants]);

    // Categories for filter
    const categories = useMemo(() => Array.from(new Set(merchants.map(m => m.category))).filter(Boolean), [merchants]);

    // Filtered list
    const filteredMerchants = useMemo(() => {
        return merchants.filter(m => {
            const matchesSearch = (m.businessName.toLowerCase().includes(searchTerm.toLowerCase()) || 
                                  m.ownerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                  m.email?.toLowerCase().includes(searchTerm.toLowerCase()));
            const matchesStatus = statusFilter === 'ALL' || m.status === statusFilter;
            const matchesCategory = categoryFilter === 'ALL' || m.category === categoryFilter;
            return matchesSearch && matchesStatus && matchesCategory;
        }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }, [merchants, searchTerm, statusFilter, categoryFilter]);

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'APPROVED': return <span className="px-2.5 py-1 rounded-md bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 text-[10px] font-bold uppercase tracking-wider border border-green-200/50 dark:border-green-800/50">Approved</span>;
            case 'PENDING': return <span className="px-2.5 py-1 rounded-md bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-400 text-[10px] font-bold uppercase tracking-wider border border-orange-200/50 dark:border-orange-800/50">Pending</span>;
            case 'REJECTED': return <span className="px-2.5 py-1 rounded-md bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 text-[10px] font-bold uppercase tracking-wider border border-red-200/50 dark:border-red-800/50">Rejected</span>;
            default: return <span className="px-2.5 py-1 rounded-md bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-[10px] font-bold uppercase tracking-wider border border-gray-200 dark:border-gray-700">{status}</span>;
        }
    };

    return (
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-8 h-full flex flex-col overflow-hidden">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8 flex-shrink-0">
                <div>
                    <h2 className="text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight flex items-center gap-3">
                        <Store className="w-8 h-8 text-[#e0b596]" /> Merchant Management
                    </h2>
                    <p className="text-gray-500 dark:text-gray-400 mt-2 text-sm font-medium">Review, verify, and manage business listings across the platform.</p>
                </div>
                <div className="flex items-center gap-3">
                    <button 
                        onClick={fetchMerchants}
                        className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-[#252525] border border-gray-200 dark:border-[#333] hover:bg-gray-50 dark:hover:bg-[#2a2a2a] text-gray-700 dark:text-gray-300 rounded-lg text-sm font-semibold transition-all shadow-sm"
                    >
                        <RotateCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} /> Refresh
                    </button>
                </div>
            </div>

            {/* Stats Dashboard */}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8 flex-shrink-0">
                <div className="bg-white dark:bg-[#252525] p-5 rounded-2xl border border-gray-200 dark:border-[#333] shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between mb-4">
                        <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Total</span>
                        <div className="w-8 h-8 rounded-full bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center">
                            <Store className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                        </div>
                    </div>
                    <div className="text-3xl font-black text-gray-900 dark:text-white">{stats.total}</div>
                </div>
                <div className="bg-white dark:bg-[#252525] p-5 rounded-2xl border border-gray-200 dark:border-[#333] shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between mb-4">
                        <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Pending</span>
                        <div className="w-8 h-8 rounded-full bg-orange-50 dark:bg-orange-900/20 flex items-center justify-center">
                            <Clock className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                        </div>
                    </div>
                    <div className="text-3xl font-black text-gray-900 dark:text-white">{stats.pending}</div>
                </div>
                <div className="bg-white dark:bg-[#252525] p-5 rounded-2xl border border-gray-200 dark:border-[#333] shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between mb-4">
                        <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Approved</span>
                        <div className="w-8 h-8 rounded-full bg-green-50 dark:bg-green-900/20 flex items-center justify-center">
                            <ShieldCheck className="w-4 h-4 text-green-600 dark:text-green-400" />
                        </div>
                    </div>
                    <div className="text-3xl font-black text-gray-900 dark:text-white">{stats.approved}</div>
                </div>
                <div className="bg-white dark:bg-[#252525] p-5 rounded-2xl border border-gray-200 dark:border-[#333] shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between mb-4">
                        <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Rejected</span>
                        <div className="w-8 h-8 rounded-full bg-red-50 dark:bg-red-900/20 flex items-center justify-center">
                            <XCircle className="w-4 h-4 text-red-600 dark:text-red-400" />
                        </div>
                    </div>
                    <div className="text-3xl font-black text-gray-900 dark:text-white">{stats.rejected}</div>
                </div>
                <div className="bg-white dark:bg-[#252525] p-5 rounded-2xl border border-gray-200 dark:border-[#333] shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between mb-4">
                        <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Featured</span>
                        <div className="w-8 h-8 rounded-full bg-purple-50 dark:bg-purple-900/20 flex items-center justify-center">
                            <Star className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                        </div>
                    </div>
                    <div className="text-3xl font-black text-gray-900 dark:text-white">{stats.featured}</div>
                </div>
            </div>

            {/* Filters Bar */}
            <div className="bg-white dark:bg-[#252525] p-2 rounded-xl border border-gray-200 dark:border-[#333] shadow-sm mb-6 flex flex-col md:flex-row items-center gap-2 flex-shrink-0">
                <div className="relative w-full md:flex-1 h-10 flex items-center">
                    <Search className="absolute left-3 w-4 h-4 text-gray-400" />
                    <input 
                        type="text"
                        placeholder="Search by name, owner, or email..." 
                        className="w-full h-full pl-9 pr-4 bg-transparent border-none text-sm text-gray-900 dark:text-white focus:outline-none placeholder:text-gray-400"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="hidden md:block w-px h-6 bg-gray-200 dark:bg-[#333]" />
                <div className="flex w-full md:w-auto gap-2">
                    <select 
                        className="flex-1 md:w-40 h-10 px-3 bg-gray-50 dark:bg-[#1f1f1f] border border-gray-200 dark:border-[#333] rounded-lg text-sm text-gray-700 dark:text-gray-300 focus:outline-none focus:border-[#e0b596] cursor-pointer"
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                    >
                        <option value="ALL">All Status</option>
                        <option value="PENDING">Pending</option>
                        <option value="APPROVED">Approved</option>
                        <option value="REJECTED">Rejected</option>
                    </select>
                    <select 
                        className="flex-1 md:w-48 h-10 px-3 bg-gray-50 dark:bg-[#1f1f1f] border border-gray-200 dark:border-[#333] rounded-lg text-sm text-gray-700 dark:text-gray-300 focus:outline-none focus:border-[#e0b596] cursor-pointer"
                        value={categoryFilter}
                        onChange={(e) => setCategoryFilter(e.target.value)}
                    >
                        <option value="ALL">All Categories</option>
                        {categories.map(cat => (
                            <option key={cat} value={cat}>{cat}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* List Container */}
            <div className="flex-1 overflow-y-auto custom-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0">
                {isLoading ? (
                    <div className="space-y-3">
                        {[1, 2, 3, 4, 5].map(i => (
                            <div key={i} className="h-20 bg-white dark:bg-[#252525] border border-gray-100 dark:border-[#333] rounded-2xl animate-pulse" />
                        ))}
                    </div>
                ) : filteredMerchants.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center py-20 text-center bg-gray-50 dark:bg-[#1f1f1f]/50 rounded-2xl border border-dashed border-gray-200 dark:border-[#333]">
                        <div className="w-16 h-16 bg-white dark:bg-[#252525] rounded-full flex items-center justify-center mb-4 shadow-sm border border-gray-100 dark:border-[#333]">
                            <Store className="w-8 h-8 text-gray-400" />
                        </div>
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">No merchants found</h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400 max-w-sm">
                            Try adjusting your filters or search term to find what you're looking for.
                        </p>
                        {(searchTerm || statusFilter !== 'ALL' || categoryFilter !== 'ALL') && (
                            <button 
                                onClick={() => { setSearchTerm(''); setStatusFilter('ALL'); setCategoryFilter('ALL'); }}
                                className="mt-4 px-4 py-2 bg-white dark:bg-[#252525] border border-gray-200 dark:border-[#333] rounded-lg text-sm font-semibold hover:bg-gray-50 dark:hover:bg-[#2a2a2a] transition-colors shadow-sm"
                            >
                                Clear all filters
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="space-y-3 pb-8">
                        {filteredMerchants.map(merchant => (
                            <div key={merchant.id} className="flex flex-col lg:flex-row items-start lg:items-center p-4 bg-white dark:bg-[#252525] border border-gray-200 dark:border-[#333] rounded-2xl hover:border-gray-300 dark:hover:border-[#444] transition-colors shadow-sm group gap-4">
                                
                                {/* Info Section */}
                                <div className="flex items-center gap-4 w-full lg:w-[35%]">
                                    <div className="w-12 h-12 rounded-xl bg-gray-100 dark:bg-[#1f1f1f] border border-gray-200 dark:border-[#333] flex items-center justify-center overflow-hidden flex-shrink-0">
                                        {merchant.logoUrl ? (
                                            <img src={merchant.logoUrl} alt={merchant.businessName} className="w-full h-full object-cover" />
                                        ) : (
                                            <Store className="w-6 h-6 text-gray-400" />
                                        )}
                                    </div>
                                    <div className="min-w-0">
                                        <h4 className="font-bold text-gray-900 dark:text-white truncate text-sm md:text-base">{merchant.businessName}</h4>
                                        <div className="flex items-center gap-2 mt-1">
                                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-gray-100 dark:bg-[#1f1f1f] text-gray-600 dark:text-gray-400 uppercase tracking-wide truncate max-w-[150px]">
                                                {merchant.category}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {/* Contact & Location */}
                                <div className="flex flex-col gap-1.5 w-full lg:w-[25%] text-xs text-gray-500 dark:text-gray-400">
                                    <div className="flex items-center gap-2 truncate">
                                        <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
                                        <span className="truncate">{merchant.city || 'N/A'}, {merchant.state || 'N/A'}</span>
                                    </div>
                                    <div className="flex items-center gap-2 truncate">
                                        <Mail className="w-3.5 h-3.5 flex-shrink-0" />
                                        <span className="truncate">{merchant.email || 'N/A'}</span>
                                    </div>
                                </div>

                                {/* Status & Date */}
                                <div className="w-full lg:w-[20%] flex flex-row lg:flex-col items-center lg:items-start justify-between lg:justify-center gap-2">
                                    <div className="flex gap-2 items-center">
                                        {getStatusBadge(merchant.status)}
                                        {merchant.isFeatured && (
                                            <span className="px-2.5 py-1 rounded-md bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-400 text-[10px] font-bold uppercase tracking-wider border border-purple-200/50 dark:border-purple-800/50">
                                                Featured
                                            </span>
                                        )}
                                    </div>
                                    <span className="text-[11px] font-medium text-gray-400">
                                        Added {format(new Date(merchant.createdAt), 'MMM d, yyyy')}
                                    </span>
                                </div>

                                {/* Actions */}
                                <div className="w-full lg:w-auto lg:flex-1 flex items-center justify-end gap-1.5 border-t lg:border-t-0 border-gray-100 dark:border-[#333] pt-3 lg:pt-0">
                                    {merchant.status !== 'APPROVED' && (
                                        <Tooltip content="Approve">
                                            <button onClick={() => updateStatus(merchant.id, 'APPROVED')} className="p-2 rounded-lg text-gray-400 hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors">
                                                <Check className="w-4 h-4" />
                                            </button>
                                        </Tooltip>
                                    )}
                                    {merchant.status !== 'REJECTED' && (
                                        <Tooltip content="Reject">
                                            <button onClick={() => updateStatus(merchant.id, 'REJECTED')} className="p-2 rounded-lg text-gray-400 hover:text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-900/20 transition-colors">
                                                <X className="w-4 h-4" />
                                            </button>
                                        </Tooltip>
                                    )}
                                    <Tooltip content={merchant.isFeatured ? "Unfeature" : "Feature"}>
                                        <button onClick={() => toggleFeature(merchant.id, merchant.isFeatured)} className={`p-2 rounded-lg transition-colors ${merchant.isFeatured ? 'text-purple-500 bg-purple-50 dark:bg-purple-900/20' : 'text-gray-400 hover:text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/20'}`}>
                                            <Star className={`w-4 h-4 ${merchant.isFeatured ? 'fill-current' : ''}`} />
                                        </button>
                                    </Tooltip>
                                    <div className="w-px h-4 bg-gray-200 dark:bg-[#333] mx-1" />
                                    <Tooltip content="View Details">
                                        <button onClick={() => setSelectedMerchant(merchant)} className="p-2 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors">
                                            <Eye className="w-4 h-4" />
                                        </button>
                                    </Tooltip>
                                    <Tooltip content="Delete">
                                        <button onClick={() => deleteMerchant(merchant.id)} className="p-2 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </Tooltip>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* View Details Side Drawer */}
            <AnimatePresence>
                {selectedMerchant && (
                    <>
                        <motion.div 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40"
                            onClick={() => setSelectedMerchant(null)}
                        />
                        <motion.div 
                            initial={{ x: '100%', opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            exit={{ x: '100%', opacity: 0 }}
                            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                            className="fixed inset-y-0 right-0 w-full max-w-md bg-white dark:bg-[#1b1b1b] shadow-2xl z-50 flex flex-col border-l border-gray-200 dark:border-[#333]"
                        >
                            {/* Drawer Header */}
                            <div className="flex items-center justify-between p-5 border-b border-gray-200 dark:border-[#333] bg-gray-50/50 dark:bg-[#1f1f1f]/50">
                                <div>
                                    <h3 className="font-bold text-lg text-gray-900 dark:text-white">Merchant Details</h3>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">ID: #{selectedMerchant.id}</p>
                                </div>
                                <button onClick={() => setSelectedMerchant(null)} className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-[#333] transition-colors">
                                    <X className="w-5 h-5 text-gray-500" />
                                </button>
                            </div>

                            {/* Drawer Content */}
                            <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                                {/* Profile Header */}
                                <div className="flex items-center gap-5 mb-8">
                                    <div className="w-20 h-20 rounded-2xl bg-gray-100 dark:bg-[#252525] border border-gray-200 dark:border-[#333] flex items-center justify-center overflow-hidden shadow-sm">
                                        {selectedMerchant.logoUrl ? (
                                            <img src={selectedMerchant.logoUrl} alt="Logo" className="w-full h-full object-cover" />
                                        ) : (
                                            <Store className="w-8 h-8 text-gray-400" />
                                        )}
                                    </div>
                                    <div>
                                        <h2 className="text-xl font-bold text-gray-900 dark:text-white">{selectedMerchant.businessName}</h2>
                                        <div className="flex items-center gap-2 mt-2">
                                            {getStatusBadge(selectedMerchant.status)}
                                            {selectedMerchant.isFeatured && <span className="px-2 py-0.5 rounded bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-400 text-[10px] font-bold uppercase tracking-wider">Featured</span>}
                                        </div>
                                    </div>
                                </div>

                                {/* Actions row */}
                                <div className="flex gap-2 mb-8 bg-gray-50 dark:bg-[#1f1f1f] p-2 rounded-xl border border-gray-100 dark:border-[#333]">
                                    <button 
                                        onClick={() => updateStatus(selectedMerchant.id, 'APPROVED')}
                                        disabled={selectedMerchant.status === 'APPROVED'}
                                        className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed hover:bg-white dark:hover:bg-[#252525] hover:shadow-sm"
                                    >
                                        <Check className="w-4 h-4 text-green-600" /> <span className={selectedMerchant.status === 'APPROVED' ? 'text-green-600' : 'text-gray-700 dark:text-gray-300'}>Approve</span>
                                    </button>
                                    <button 
                                        onClick={() => updateStatus(selectedMerchant.id, 'REJECTED')}
                                        disabled={selectedMerchant.status === 'REJECTED'}
                                        className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed hover:bg-white dark:hover:bg-[#252525] hover:shadow-sm"
                                    >
                                        <X className="w-4 h-4 text-orange-600" /> <span className={selectedMerchant.status === 'REJECTED' ? 'text-orange-600' : 'text-gray-700 dark:text-gray-300'}>Reject</span>
                                    </button>
                                    <button 
                                        onClick={() => toggleFeature(selectedMerchant.id, selectedMerchant.isFeatured)}
                                        className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-semibold transition-colors hover:bg-white dark:hover:bg-[#252525] hover:shadow-sm"
                                    >
                                        <Star className={`w-4 h-4 ${selectedMerchant.isFeatured ? 'text-purple-600 fill-current' : 'text-gray-400'}`} /> 
                                        <span className={selectedMerchant.isFeatured ? 'text-purple-600' : 'text-gray-700 dark:text-gray-300'}>Feature</span>
                                    </button>
                                </div>

                                {/* Information sections */}
                                <div className="space-y-6">
                                    <section>
                                        <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2"><Briefcase className="w-4 h-4" /> About</h4>
                                        <div className="bg-gray-50 dark:bg-[#1f1f1f] rounded-xl p-4 border border-gray-100 dark:border-[#333]">
                                            <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{selectedMerchant.description || 'No description provided.'}</p>
                                        </div>
                                    </section>

                                    <section>
                                        <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2"><MapPin className="w-4 h-4" /> Contact & Location</h4>
                                        <div className="bg-white dark:bg-[#252525] rounded-xl border border-gray-200 dark:border-[#333] divide-y divide-gray-100 dark:divide-[#333]">
                                            <div className="p-3 flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-lg bg-gray-50 dark:bg-[#1f1f1f] flex items-center justify-center"><Phone className="w-4 h-4 text-gray-500" /></div>
                                                <div className="min-w-0 flex-1">
                                                    <p className="text-[10px] text-gray-500 uppercase font-bold">Phone</p>
                                                    <p className="text-sm text-gray-900 dark:text-white truncate">{selectedMerchant.phone || 'N/A'}</p>
                                                </div>
                                            </div>
                                            <div className="p-3 flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-lg bg-gray-50 dark:bg-[#1f1f1f] flex items-center justify-center"><Mail className="w-4 h-4 text-gray-500" /></div>
                                                <div className="min-w-0 flex-1">
                                                    <p className="text-[10px] text-gray-500 uppercase font-bold">Email</p>
                                                    <p className="text-sm text-gray-900 dark:text-white truncate">{selectedMerchant.email || 'N/A'}</p>
                                                </div>
                                            </div>
                                            <div className="p-3 flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-lg bg-gray-50 dark:bg-[#1f1f1f] flex items-center justify-center"><Globe className="w-4 h-4 text-gray-500" /></div>
                                                <div className="min-w-0 flex-1">
                                                    <p className="text-[10px] text-gray-500 uppercase font-bold">Website</p>
                                                    {selectedMerchant.website ? (
                                                        <a href={selectedMerchant.website} target="_blank" rel="noreferrer" className="text-sm text-blue-600 hover:underline truncate block">{selectedMerchant.website}</a>
                                                    ) : <p className="text-sm text-gray-900 dark:text-white">N/A</p>}
                                                </div>
                                            </div>
                                            <div className="p-3 flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-lg bg-gray-50 dark:bg-[#1f1f1f] flex items-center justify-center"><Map className="w-4 h-4 text-gray-500" /></div>
                                                <div className="min-w-0 flex-1">
                                                    <p className="text-[10px] text-gray-500 uppercase font-bold">Address</p>
                                                    <p className="text-sm text-gray-900 dark:text-white">{selectedMerchant.address || ''} {selectedMerchant.city || ''}, {selectedMerchant.state || ''} {selectedMerchant.zipCode || ''}</p>
                                                </div>
                                            </div>
                                        </div>
                                    </section>

                                    <section>
                                        <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2"><Calendar className="w-4 h-4" /> System Info</h4>
                                        <div className="bg-white dark:bg-[#252525] rounded-xl border border-gray-200 dark:border-[#333] p-4 flex flex-col gap-3 text-sm">
                                            <div className="flex justify-between">
                                                <span className="text-gray-500">Created On</span>
                                                <span className="font-semibold text-gray-900 dark:text-white">{format(new Date(selectedMerchant.createdAt), 'PPpp')}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-gray-500">Last Updated</span>
                                                <span className="font-semibold text-gray-900 dark:text-white">{format(new Date(selectedMerchant.updatedAt), 'PPpp')}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-gray-500">Owner ID</span>
                                                <span className="font-semibold text-gray-900 dark:text-white text-xs font-mono bg-gray-100 dark:bg-[#1f1f1f] px-2 py-0.5 rounded">{selectedMerchant.userId}</span>
                                            </div>
                                        </div>
                                    </section>
                                </div>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </div>
    );
}
