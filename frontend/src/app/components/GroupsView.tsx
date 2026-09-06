import { fetchWithAuth } from '../../utils/apiClient';
import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, Edit2, Users } from 'lucide-react';
import { Button } from './ui/button';
import { Group } from '../types';
import { Friend } from './CreateReminder';
import { API_BASE_URL } from '../api';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';

export function GroupsView() {
    const [groups, setGroups] = useState<Group[]>([]);
    const [friends, setFriends] = useState<Friend[]>([]);
    const [activeTab, setActiveTab] = useState<'groups' | 'friends'>('friends');
    const [isLoading, setIsLoading] = useState(true);
    const [editingGroup, setEditingGroup] = useState<Group | null>(null);
    const [groupName, setGroupName] = useState('');
    const [members, setMembers] = useState<string[]>([]);
    const [memberInput, setMemberInput] = useState('');
    const [isFormVisible, setIsFormVisible] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetchGroups();
    }, []);

    const fetchJson = async (url: string, options: RequestInit = {}) => {
        const headers = new Headers(options.headers || {});
        if (!headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
        const response = await fetchWithAuth(url.startsWith('http') ? url : `${API_BASE_URL}${url}`, { ...options, headers });
        if (!response.ok) {
            const errData = await response.json().catch(() => ({}));
            throw { status: response.status, data: errData };
        }
        return response.json();
    };

    const fetchGroups = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const [groupsData, friendsData] = await Promise.all([
                fetchJson('/api/groups'),
                fetchJson('/api/friends')
            ]);
            setGroups(groupsData);
            setFriends(friendsData);
        } catch (error: any) {
            let msg = 'Server error. Please try again later.';
            if (error?.status === 401) msg = 'Session expired. Please log in again.';
            else if (error?.message === 'Failed to fetch') msg = 'Network error. Please check your connection.';
            setError(msg);
            toast.error(msg);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSaveGroup = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!groupName.trim()) {
            toast.error('Group name is required');
            return;
        }

        try {
            if (editingGroup) {
                const updated = await fetchJson(`/api/groups/${editingGroup.id}`, {
                    method: 'PUT',
                    body: JSON.stringify({ name: groupName, members })
                });
                setGroups(prev => prev.map(g => g.id === updated.id ? updated : g));
                toast.success('Group updated');
            } else {
                const newGroup = await fetchJson('/api/groups', {
                    method: 'POST',
                    body: JSON.stringify({ name: groupName, members })
                });
                setGroups(prev => [newGroup, ...prev]);
                toast.success('Group created');
            }
            resetForm();
        } catch (error) {
            toast.error('Failed to save group');
        }
    };

    const handleDeleteGroup = async (id: string) => {
        if (!confirm('Are you sure you want to delete this group?')) return;
        try {
            await fetchJson(`/api/groups/${id}`, { method: 'DELETE' });
            setGroups(prev => prev.filter(g => g.id !== id));
            toast.success('Group deleted');
        } catch (error) {
            toast.error('Failed to delete group');
        }
    };

    const handleEditGroup = (group: Group) => {
        setEditingGroup(group);
        setGroupName(group.name);
        setMembers(group.members || []);
        setIsFormVisible(true);
    };

    const handleAddMember = () => {
        if (!memberInput.trim()) return;
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(memberInput)) {
            toast.error('Please enter a valid email address');
            return;
        }
        if (members.includes(memberInput)) {
            toast.error('Member already in group');
            return;
        }
        setMembers(prev => [...prev, memberInput]);
        setMemberInput('');
    };

    const handleRemoveMember = (email: string) => {
        setMembers(prev => prev.filter(m => m !== email));
    };

    const resetForm = () => {
        setEditingGroup(null);
        setGroupName('');
        setMembers([]);
        setMemberInput('');
        setIsFormVisible(false);
    };

    return (
        <div className="flex-1 flex flex-col h-full bg-white dark:bg-[#0a0a0a]">
            {/* Top Tabs (WhatsApp style inline tab switching) */}
            <div className="flex items-center pt-2 px-4 border-b border-gray-100 dark:border-white/[0.04] bg-white dark:bg-[#0a0a0a] z-10 sticky top-0">
                <button
                    onClick={() => { setActiveTab('friends'); setIsFormVisible(false); }}
                    className={`flex-1 py-3 text-[15px] font-bold text-center transition-colors relative ${activeTab === 'friends' ? 'text-[#e0b596]' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
                >
                    Friends
                    {activeTab === 'friends' && (
                        <motion.div
                            layoutId="whatsappTabIndicator"
                            className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#e0b596]"
                            transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                        />
                    )}
                </button>
                <button
                    onClick={() => { setActiveTab('groups'); setIsFormVisible(false); }}
                    className={`flex-1 py-3 text-[15px] font-bold text-center transition-colors relative ${activeTab === 'groups' ? 'text-[#e0b596]' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
                >
                    Groups
                    {activeTab === 'groups' && (
                        <motion.div
                            layoutId="whatsappTabIndicator"
                            className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#e0b596]"
                            transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                        />
                    )}
                </button>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 relative overflow-hidden bg-gray-50 dark:bg-black">
                <AnimatePresence initial={false} custom={activeTab} mode="wait">
                    <motion.div
                        key={activeTab + (isFormVisible ? '-form' : '')}
                        initial={{ x: activeTab === 'friends' ? -20 : (isFormVisible ? 0 : 20), opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        exit={{ x: activeTab === 'friends' ? -20 : (isFormVisible ? 0 : 20), opacity: 0 }}
                        transition={{ duration: 0.3, ease: 'easeInOut' }}
                        className="absolute inset-0 overflow-y-auto custom-scrollbar p-4"
                        style={{ paddingBottom: '120px' }} // extra padding for bottom bar
                    >
                        {isFormVisible ? (
                            <div className="max-w-xl mx-auto bg-white dark:bg-[#0a0a0a] rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-white/[0.04]">
                                <form onSubmit={handleSaveGroup} className="space-y-4">
                                    <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
                                        {editingGroup ? 'Edit Group' : 'Create New Group'}
                                    </h2>
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Group Name</label>
                                        <input
                                            type="text"
                                            value={groupName}
                                            onChange={e => setGroupName(e.target.value)}
                                            placeholder="e.g. Family, Work Team"
                                            className="w-full bg-gray-50 dark:bg-black border border-gray-200 dark:border-white/10 rounded-xl px-4 py-3 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-[#e0b596] outline-none transition-all"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Members (Emails)</label>
                                        <div className="flex gap-2 mb-2">
                                            <input
                                                type="email"
                                                value={memberInput}
                                                onChange={e => setMemberInput(e.target.value)}
                                                onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleAddMember())}
                                                placeholder="Add member email"
                                                className="flex-1 bg-gray-50 dark:bg-black border border-gray-200 dark:border-white/10 rounded-xl px-4 py-3 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-[#e0b596] outline-none transition-all"
                                            />
                                            <Button type="button" onClick={handleAddMember} className="bg-[#e0b596] hover:bg-[#d4a37f] text-white px-5 rounded-xl font-semibold">Add</Button>
                                        </div>
                                        <div className="flex flex-wrap gap-2">
                                            {members.map(member => (
                                                <div key={member} className="bg-gray-100 dark:bg-black px-3 py-1.5 rounded-full text-xs flex items-center gap-1.5 text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-transparent">
                                                    {member}
                                                    <button type="button" onClick={() => handleRemoveMember(member)} className="text-gray-400 hover:text-red-500">
                                                        <X className="w-3.5 h-3.5" />
                                                    </button>
                                                </div>
                                            ))}
                                            {members.length === 0 && <span className="text-xs text-gray-500 mt-1">No members added yet</span>}
                                        </div>
                                    </div>

                                    <div className="flex gap-3 pt-6">
                                        <Button type="button" onClick={resetForm} variant="ghost" className="flex-1 py-6 rounded-xl font-semibold">Cancel</Button>
                                        <Button type="submit" className="flex-1 bg-[#e0b596] hover:bg-[#d4a37f] text-white py-6 rounded-xl font-semibold">Save Group</Button>
                                    </div>
                                </form>
                            </div>
                        ) : activeTab === 'groups' ? (
                            <div className="max-w-3xl mx-auto">
                                <div className="mb-6 flex justify-end">
                                    <Button onClick={() => setIsFormVisible(true)} className="bg-[#e0b596] hover:bg-[#d4a37f] text-white flex items-center gap-2 rounded-xl px-5 py-5 font-semibold shadow-sm hover:shadow-md">
                                        <Plus className="w-4 h-4" /> Create New Group
                                    </Button>
                                </div>

                                {isLoading ? (
                                    <div className="text-center text-gray-500 py-12">Loading groups...</div>
                                ) : error ? (
                                    <div className="text-center text-gray-500 py-12">
                                        <div className="w-12 h-12 mx-auto text-red-400 mb-3 flex items-center justify-center">
                                            <X className="w-8 h-8" />
                                        </div>
                                        <p className="text-red-500 mb-4">{error}</p>
                                        <Button onClick={fetchGroups} className="mx-auto bg-gray-100 hover:bg-gray-200 text-gray-800 dark:bg-[#0a0a0a] dark:text-gray-200 border border-gray-300 dark:border-white/10 rounded-xl px-6">Try Again</Button>
                                    </div>
                                ) : groups.length === 0 ? (
                                    <div className="text-center text-gray-500 py-16 bg-white dark:bg-[#0a0a0a] rounded-2xl border border-gray-100 dark:border-white/[0.04]">
                                        <Users className="w-16 h-16 mx-auto text-gray-300 dark:text-gray-600 mb-4" />
                                        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">No Groups Yet</h3>
                                        <p>You haven't created any groups yet. Create one to easily share tasks!</p>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {groups.map(group => (
                                            <div key={group.id} className="bg-white dark:bg-[#0a0a0a] p-5 rounded-2xl border border-gray-100 dark:border-white/[0.04] shadow-sm hover:shadow-md hover:border-[#e0b596]/30 transition-all flex flex-col justify-between">
                                                <div>
                                                    <div className="flex justify-between items-start mb-3">
                                                        <h3 className="text-lg font-bold text-gray-900 dark:text-white">{group.name}</h3>
                                                        <div className="flex gap-1.5">
                                                            <button onClick={() => handleEditGroup(group)} className="p-2 text-gray-400 hover:text-[#e0b596] bg-gray-50 dark:bg-black rounded-lg transition-colors">
                                                                <Edit2 className="w-4 h-4" />
                                                            </button>
                                                            <button onClick={() => handleDeleteGroup(group.id)} className="p-2 text-gray-400 hover:text-red-500 bg-gray-50 dark:bg-black rounded-lg transition-colors">
                                                                <Trash2 className="w-4 h-4" />
                                                            </button>
                                                        </div>
                                                    </div>
                                                    <div className="flex flex-wrap gap-1.5 mb-2">
                                                        {group.members?.slice(0, 3).map(m => (
                                                            <span key={m} className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-teal-50 text-teal-600 dark:bg-teal-900/30 dark:text-teal-400 text-xs font-bold ring-2 ring-teal-500 dark:ring-teal-400 border-2 border-white dark:border-[#0a0a0a] -ml-2 first:ml-0 shadow-sm" title={m}>
                                                                {m.charAt(0).toUpperCase()}
                                                            </span>
                                                        ))}
                                                        {(group.members?.length || 0) > 3 && (
                                                            <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 text-xs font-bold ring-2 ring-gray-300 dark:ring-gray-600 border-2 border-white dark:border-[#0a0a0a] -ml-2 shadow-sm">
                                                                +{(group.members?.length || 0) - 3}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                                <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mt-2">{group.members?.length || 0} members</p>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="max-w-3xl mx-auto">
                                {isLoading ? (
                                    <div className="text-center text-gray-500 py-12">Loading contacts...</div>
                                ) : friends.length === 0 ? (
                                    <div className="text-center text-gray-500 py-16 bg-white dark:bg-[#0a0a0a] rounded-2xl border border-gray-100 dark:border-white/[0.04]">
                                        <Users className="w-16 h-16 mx-auto text-gray-300 dark:text-gray-600 mb-4" />
                                        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">No Contacts</h3>
                                        <p>Invite someone to a task to automatically add them to your contacts.</p>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {friends.map(friend => (
                                            <div key={friend.id} className="bg-white dark:bg-[#0a0a0a] p-4 rounded-2xl border border-gray-100 dark:border-white/[0.04] shadow-sm flex items-center gap-4 transition-all hover:border-[#e0b596]/30">
                                                <div className="w-12 h-12 rounded-full bg-teal-50 text-teal-600 dark:bg-teal-900/30 dark:text-teal-400 flex items-center justify-center text-lg font-bold ring-2 ring-teal-500 dark:ring-teal-400 ring-offset-2 ring-offset-white dark:ring-offset-[#0a0a0a] shrink-0 shadow-sm">
                                                    {(friend.name || friend.email).charAt(0).toUpperCase()}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <h3 className="font-bold text-gray-900 dark:text-white truncate text-base">{friend.name || friend.email.split('@')[0]}</h3>
                                                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">{friend.email}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </motion.div>
                </AnimatePresence>
            </div>
        </div>
    );
}
