import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from '@/app/api';
import { Merchant } from '@/app/types';
import { MerchantCard } from './MerchantCard';
import { Input } from '@/app/components/ui/input';
import { Search, Filter, Loader2 } from 'lucide-react';

export function MerchantList() {
    const [merchants, setMerchants] = useState<Merchant[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('');

    useEffect(() => {
        const fetchMerchants = async () => {
            try {
                const res = await fetch(`${API_BASE_URL}/api/merchants`);
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

        fetchMerchants();
    }, []);

    const categories = Array.from(new Set(merchants.map(m => m.category))).filter(Boolean);

    const filteredMerchants = merchants.filter(merchant => {
        const matchesSearch = merchant.businessName.toLowerCase().includes(searchTerm.toLowerCase()) || 
                              merchant.description?.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesCategory = selectedCategory ? merchant.category === selectedCategory : true;
        return matchesSearch && matchesCategory;
    });

    if (isLoading) {
        return (
            <div className="flex justify-center items-center h-64">
                <Loader2 className="w-8 h-8 animate-spin text-[#e0b596]" />
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto px-4 py-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Available Listings</h2>
                    <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Discover businesses and services in your area</p>
                </div>
                
                <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
                    <div className="relative w-full sm:w-64">
                        <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                        <Input 
                            placeholder="Search businesses..." 
                            className="pl-9" 
                            value={searchTerm} 
                            onChange={(e) => setSearchTerm(e.target.value)} 
                        />
                    </div>
                    
                    <div className="relative w-full sm:w-48">
                        <Filter className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                        <select 
                            className="flex h-10 w-full items-center justify-between rounded-md border border-gray-200 bg-white px-9 py-2 text-sm ring-offset-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-950 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-800 dark:bg-gray-950 dark:ring-offset-gray-950 dark:placeholder:text-gray-400 dark:focus:ring-gray-300 appearance-none"
                            value={selectedCategory}
                            onChange={(e) => setSelectedCategory(e.target.value)}
                        >
                            <option value="">All Categories</option>
                            {categories.map(cat => (
                                <option key={cat} value={cat}>{cat}</option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            {filteredMerchants.length === 0 ? (
                <div className="text-center py-20 bg-gray-50 dark:bg-[#1f1f1f] rounded-2xl border border-dashed border-gray-200 dark:border-gray-800">
                    <p className="text-gray-500 dark:text-gray-400">No listings found matching your criteria.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {filteredMerchants.map(merchant => (
                        <MerchantCard key={merchant.id} merchant={merchant} />
                    ))}
                </div>
            )}
        </div>
    );
}
