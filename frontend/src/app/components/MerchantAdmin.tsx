import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from '@/app/api';
import { Merchant } from '@/app/types';
import { MerchantCard } from './MerchantCard';
import { Loader2, ShieldCheck, Store, Clock, XCircle, Star } from 'lucide-react';
import { toast } from 'sonner';

export function MerchantAdmin() {
    const [merchants, setMerchants] = useState<Merchant[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const fetchMerchants = async () => {
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
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchMerchants();
    }, []);

    const updateStatus = async (id: number, status: string) => {
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
                toast.success(`Merchant marked as ${status}`);
                fetchMerchants();
            } else {
                toast.error('Failed to update status');
            }
        } catch (error) {
            toast.error('Error updating status');
        }
    };

    const toggleFeature = async (id: number, isFeatured: boolean) => {
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
                fetchMerchants();
            } else {
                toast.error('Failed to update feature status');
            }
        } catch (error) {
            toast.error('Error updating feature status');
        }
    };

    const deleteMerchant = async (id: number) => {
        if (!window.confirm('Are you sure you want to delete this listing?')) return;
        
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${API_BASE_URL}/api/merchants/${id}`, {
                method: 'DELETE',
                headers: { 'x-auth-token': token || '' }
            });

            if (res.ok) {
                toast.success('Merchant deleted');
                fetchMerchants();
            } else {
                toast.error('Failed to delete merchant');
            }
        } catch (error) {
            toast.error('Error deleting merchant');
        }
    };

    if (isLoading) {
        return (
            <div className="flex justify-center items-center h-64">
                <Loader2 className="w-8 h-8 animate-spin text-[#e0b596]" />
            </div>
        );
    }

    const stats = {
        total: merchants.length,
        pending: merchants.filter(m => m.status === 'PENDING').length,
        approved: merchants.filter(m => m.status === 'APPROVED').length,
        rejected: merchants.filter(m => m.status === 'REJECTED').length,
        featured: merchants.filter(m => m.isFeatured).length,
    };

    return (
        <div className="max-w-7xl mx-auto px-4 py-8">
            <div className="mb-8">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                    <ShieldCheck className="w-6 h-6 text-[#e0b596]" /> Admin: Merchant Management
                </h2>
                <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Review and manage all business listings</p>
            </div>

            {/* Stats Dashboard */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
                <div className="bg-white dark:bg-[#252525] p-4 rounded-xl border border-gray-100 dark:border-gray-800 flex flex-col items-center justify-center">
                    <Store className="w-5 h-5 text-gray-400 mb-2" />
                    <div className="text-2xl font-bold">{stats.total}</div>
                    <div className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Total</div>
                </div>
                <div className="bg-yellow-50 dark:bg-yellow-900/10 p-4 rounded-xl border border-yellow-100 dark:border-yellow-900/30 flex flex-col items-center justify-center">
                    <Clock className="w-5 h-5 text-yellow-500 mb-2" />
                    <div className="text-2xl font-bold text-yellow-700 dark:text-yellow-500">{stats.pending}</div>
                    <div className="text-xs text-yellow-600 dark:text-yellow-600 uppercase tracking-wider font-semibold">Pending</div>
                </div>
                <div className="bg-green-50 dark:bg-green-900/10 p-4 rounded-xl border border-green-100 dark:border-green-900/30 flex flex-col items-center justify-center">
                    <ShieldCheck className="w-5 h-5 text-green-500 mb-2" />
                    <div className="text-2xl font-bold text-green-700 dark:text-green-500">{stats.approved}</div>
                    <div className="text-xs text-green-600 dark:text-green-600 uppercase tracking-wider font-semibold">Approved</div>
                </div>
                <div className="bg-red-50 dark:bg-red-900/10 p-4 rounded-xl border border-red-100 dark:border-red-900/30 flex flex-col items-center justify-center">
                    <XCircle className="w-5 h-5 text-red-500 mb-2" />
                    <div className="text-2xl font-bold text-red-700 dark:text-red-500">{stats.rejected}</div>
                    <div className="text-xs text-red-600 dark:text-red-600 uppercase tracking-wider font-semibold">Rejected</div>
                </div>
                <div className="bg-[#e0b596]/10 p-4 rounded-xl border border-[#e0b596]/30 flex flex-col items-center justify-center">
                    <Star className="w-5 h-5 text-[#e0b596] mb-2" />
                    <div className="text-2xl font-bold text-[#e0b596]">{stats.featured}</div>
                    <div className="text-xs text-[#cda283] uppercase tracking-wider font-semibold">Featured</div>
                </div>
            </div>

            {/* List */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {merchants.map(merchant => (
                    <MerchantCard 
                        key={merchant.id} 
                        merchant={merchant} 
                        isAdminView={true}
                        onApprove={(id) => updateStatus(id, 'APPROVED')}
                        onReject={(id) => updateStatus(id, 'REJECTED')}
                        onFeature={toggleFeature}
                        onDelete={deleteMerchant}
                    />
                ))}
            </div>
            
            {merchants.length === 0 && (
                <div className="text-center py-20 bg-gray-50 dark:bg-[#1f1f1f] rounded-2xl border border-dashed border-gray-200 dark:border-gray-800">
                    <p className="text-gray-500 dark:text-gray-400">No merchants found.</p>
                </div>
            )}
        </div>
    );
}
