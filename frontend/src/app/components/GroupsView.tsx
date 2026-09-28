import { fetchWithAuth } from '../../utils/apiClient';
import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, Edit2, Users, ChevronRight, ChevronDown } from 'lucide-react';
import { Button } from './ui/button';
import { Group } from '../types';
import { Friend } from './CreateReminder';
import { API_BASE_URL } from '../api';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { getGroupType, GROUP_TYPES, GroupTypeName } from '../utils/groupTypes';

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
    const [isFriendFormVisible, setIsFriendFormVisible] = useState(false);
    const [friendEmail, setFriendEmail] = useState('');
    const [friendName, setFriendName] = useState('');
    const [editingFriendId, setEditingFriendId] = useState<string | null>(null);
    const [editFriendEmail, setEditFriendEmail] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [selectedGroupType, setSelectedGroupType] = useState<GroupTypeName | null>(null);
    const [showGroupTypePicker, setShowGroupTypePicker] = useState(false);

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

        const finalType = selectedGroupType || getGroupType(groupName).id;
        try {
            if (editingGroup) {
                const updated = await fetchJson(`/api/groups/${editingGroup.id}`, {
                    method: 'PUT',
                    body: JSON.stringify({ name: groupName, members, groupType: finalType })
                });
                setGroups(prev => prev.map(g => g.id === updated.id ? updated : g));
                toast.success('Group updated');
            } else {
                const newGroup = await fetchJson('/api/groups', {
                    method: 'POST',
                    body: JSON.stringify({ name: groupName, members, groupType: finalType })
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

    const handleAddFriend = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!friendEmail.trim()) {
            toast.error('Email is required');
            return;
        }

        try {
            const newFriend = await fetchJson('/api/friends', {
                method: 'POST',
                body: JSON.stringify({ email: friendEmail, name: friendName })
            });
            setFriends(prev => [newFriend, ...prev]);
            toast.success('Friend added');
            setFriendEmail('');
            setFriendName('');
            setIsFriendFormVisible(false);
        } catch (error: any) {
            toast.error(error?.data?.msg || 'Failed to add friend');
        }
    };

    const handleEditFriend = async (friendId: string) => {
        if (!editFriendEmail) {
            toast.error('Email is required');
            return;
        }
        try {
            const updatedFriend = await fetchJson(`/api/friends/${friendId}`, {
                method: 'PUT',
                body: JSON.stringify({ email: editFriendEmail })
            });
            setFriends(friends.map(f => String(f.id) === friendId ? { ...f, email: editFriendEmail } : f));
            toast.success('Contact updated');
            setEditingFriendId(null);
            setEditFriendEmail('');
        } catch (error: any) {
            toast.error(error?.data?.msg || 'Failed to update contact');
        }
    };

    const handleDeleteFriend = async (id: string) => {
        if (!confirm('Are you sure you want to remove this friend?')) return;
        try {
            await fetchJson(`/api/friends/${id}`, { method: 'DELETE' });
            setFriends(prev => prev.filter(f => String(f.id) !== String(id)));
            toast.success('Friend removed');
        } catch (error) {
            console.error(error); toast.error(error?.data?.msg || 'Failed to remove friend. Did you restart the backend?');
        }
    };

    const handleEditGroup = (group: Group) => {
        setEditingGroup(group);
        setGroupName(group.name);
        setMembers(group.members || []);
        setSelectedGroupType(group.groupType as GroupTypeName || null);
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
        setSelectedGroupType(null);
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
                    onClick={() => { setActiveTab('groups'); setIsFormVisible(false); setIsFriendFormVisible(false); }}
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

                                    {/* Group Type Picker */}
                                    <div className="relative z-30">
                                        <button
                                            type="button"
                                            onClick={() => setShowGroupTypePicker(!showGroupTypePicker)}
                                            className="flex items-center gap-2 text-[12px] font-bold text-gray-500 hover:text-gray-800 dark:hover:text-gray-200 transition-colors bg-gray-50 dark:bg-[#0a0a0a] px-3 py-1.5 rounded-full border border-gray-100 dark:border-white/[0.04]"
                                        >
                                            {(() => {
                                                const currentCatId = selectedGroupType || getGroupType(groupName || '').id;
                                                const cat = GROUP_TYPES.find(c => c.id === currentCatId);
                                                if (!cat) return <span>Group Type</span>;
                                                const Icon = cat.icon;
                                                return (
                                                    <>
                                                        <Icon size={14} style={{ color: cat.iconColor }} />
                                                        <span>{cat.id}</span>
                                                        <ChevronDown className="w-3 h-3 text-gray-400" />
                                                    </>
                                                );
                                            })()}
                                        </button>
                                        
                                        <AnimatePresence>
                                            {showGroupTypePicker && (
                                                <>
                                                    <div className="fixed inset-0 z-40" onClick={() => setShowGroupTypePicker(false)} />
                                                    <motion.div
                                                        initial={{ opacity: 0, y: -5, scale: 0.98 }}
                                                        animate={{ opacity: 1, y: 0, scale: 1 }}
                                                        exit={{ opacity: 0, y: -5, scale: 0.98 }}
                                                        className="absolute left-0 mt-2 w-64 bg-white dark:bg-[#0a0a0a] border border-gray-200 dark:border-white/[0.04] rounded-2xl shadow-2xl z-[100] max-h-60 overflow-y-auto custom-scrollbar p-2"
                                                    >
                                                        <div className="grid grid-cols-2 gap-1">
                                                            {GROUP_TYPES.map(cat => (
                                                                <button
                                                                    key={cat.id}
                                                                    type="button"
                                                                    onClick={() => {
                                                                        setSelectedGroupType(cat.id);
                                                                        setShowGroupTypePicker(false);
                                                                    }}
                                                                    className={`flex items-center gap-2 p-2 rounded-xl text-left transition-colors hover:bg-gray-50 dark:hover:bg-black border border-transparent ${
                                                                        (selectedGroupType || getGroupType(groupName || '').id) === cat.id 
                                                                            ? 'bg-gray-50 dark:bg-black border-gray-200 dark:border-gray-800' : ''
                                                                    }`}
                                                                >
                                                                    <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: cat.bgColor }}>
                                                                        <cat.icon size={12} style={{ color: cat.iconColor }} />
                                                                    </div>
                                                                    <span className="text-[11px] font-bold text-gray-700 dark:text-gray-300 truncate">{cat.id}</span>
                                                                </button>
                                                            ))}
                                                        </div>
                                                    </motion.div>
                                                </>
                                            )}
                                        </AnimatePresence>
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
                                        {editingGroup && (
                                            <Button type="button" onClick={() => { handleDeleteGroup(editingGroup.id); resetForm(); }} variant="ghost" className="flex-1 py-6 rounded-xl font-semibold text-red-500 hover:bg-red-50 hover:text-red-600">Delete</Button>
                                        )}
                                        <Button type="submit" className="flex-1 bg-[#e0b596] hover:bg-[#d4a37f] text-white py-6 rounded-xl font-semibold">Save Group</Button>
                                    </div>
                                </form>
                            </div>
                        ) : activeTab === 'groups' ? (
                            <div className="max-w-3xl mx-auto">
                                <div className="mb-6 flex justify-end">
                                    <Button onClick={() => setIsFormVisible(true)} className="bg-gradient-to-r from-[#D9AD86] to-[#C99A70] text-white flex items-center gap-2 rounded-[14px] px-5 py-5 font-bold shadow-sm hover:shadow-md transition-all">
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
                                    <div className="flex flex-col gap-3.5">
                                        {groups.map(group => {
                                            const groupTypeConfig = GROUP_TYPES.find(g => g.id === group.groupType) || getGroupType(group.name);
                                            const IconComponent = groupTypeConfig.icon;
                                            return (
                                            <div key={group.id} className="bg-white dark:bg-[#0a0a0a] p-4 rounded-[20px] shadow-sm flex items-center gap-4 transition-all hover:shadow-md cursor-pointer border border-transparent dark:border-white/[0.04]" onClick={() => handleEditGroup(group)}>
                                                {/* Icon Avatar */}
                                                <div 
                                                    className="w-14 h-14 rounded-full flex items-center justify-center shrink-0" 
                                                    style={{ backgroundColor: groupTypeConfig.bgColor }}
                                                >
                                                    <IconComponent size={24} style={{ color: groupTypeConfig.iconColor }} strokeWidth={2} />
                                                </div>
                                                
                                                {/* Details */}
                                                <div className="flex-1 min-w-0">
                                                    <h3 className="text-[17px] font-bold text-gray-900 dark:text-gray-100 truncate">{group.name}</h3>
                                                    <p className="text-[13px] font-medium text-gray-500 dark:text-gray-400 mt-0.5">{group.members?.length || 0} members</p>
                                                </div>
                                                
                                                {/* Chevron */}
                                                <div className="shrink-0 flex items-center">
                                                    <ChevronRight className="w-5 h-5 text-gray-400" />
                                                </div>
                                            </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        ) : activeTab === 'friends' ? (
                            <div className="max-w-3xl mx-auto">
                                <div className="mb-6 flex justify-end">
                                    <Button onClick={() => setIsFriendFormVisible(!isFriendFormVisible)} className="bg-[#e0b596] hover:bg-[#d4a37f] text-white flex items-center gap-2 rounded-xl px-5 py-5 font-semibold shadow-sm hover:shadow-md">
                                        <Plus className="w-4 h-4" /> Add Contact
                                    </Button>
                                </div>

                                {isFriendFormVisible && (
                                    <div className="mb-6 bg-white dark:bg-[#0a0a0a] rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-white/[0.04]">
                                        <form onSubmit={handleAddFriend} className="space-y-4">
                                            <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Add New Contact</h2>
                                            <div>
                                                <input
                                                    type="email"
                                                    value={friendEmail}
                                                    onChange={e => setFriendEmail(e.target.value)}
                                                    placeholder="Email address"
                                                    className="w-full mb-3 bg-gray-50 dark:bg-black border border-gray-200 dark:border-white/10 rounded-xl px-4 py-3 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-[#e0b596] outline-none transition-all"
                                                />
                                                <input
                                                    type="text"
                                                    value={friendName}
                                                    onChange={e => setFriendName(e.target.value)}
                                                    placeholder="Name (Optional)"
                                                    className="w-full bg-gray-50 dark:bg-black border border-gray-200 dark:border-white/10 rounded-xl px-4 py-3 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-[#e0b596] outline-none transition-all"
                                                />
                                            </div>
                                            <div className="flex gap-3">
                                                <Button type="button" onClick={() => setIsFriendFormVisible(false)} variant="ghost" className="flex-1 py-4 rounded-xl font-semibold">Cancel</Button>
                                                <Button type="submit" className="flex-1 bg-[#e0b596] hover:bg-[#d4a37f] text-white py-4 rounded-xl font-semibold">Save Contact</Button>
                                            </div>
                                        </form>
                                    </div>
                                )}

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
                                            <div key={friend.id} className="bg-white dark:bg-[#0a0a0a] p-4 rounded-2xl border border-gray-100 dark:border-white/[0.04] shadow-sm flex items-center justify-between transition-all hover:border-[#e0b596]/30">
                                                <div className="flex items-center gap-4 flex-1 min-w-0">
                                                    <div className="w-12 h-12 rounded-full bg-teal-50 text-teal-600 dark:bg-teal-900/30 dark:text-teal-400 flex items-center justify-center text-lg font-bold ring-2 ring-teal-500 dark:ring-teal-400 ring-offset-2 ring-offset-white dark:ring-offset-[#0a0a0a] shrink-0 shadow-sm">
                                                        {(friend.name || friend.email).charAt(0).toUpperCase()}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        {editingFriendId === String(friend.id) ? (
                                                            <div className="flex gap-2 items-center">
                                                                <input
                                                                    type="email"
                                                                    value={editFriendEmail}
                                                                    onChange={e => setEditFriendEmail(e.target.value)}
                                                                    className="flex-1 bg-gray-50 dark:bg-black border border-gray-200 dark:border-white/10 rounded-lg px-3 py-1.5 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-[#e0b596] outline-none"
                                                                    placeholder="New email"
                                                                    autoFocus
                                                                />
                                                                <button onClick={() => handleEditFriend(String(friend.id))} className="text-xs bg-[#e0b596] text-white px-3 py-1.5 rounded-lg">Save</button>
                                                                <button onClick={() => setEditingFriendId(null)} className="text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">Cancel</button>
                                                            </div>
                                                        ) : (
                                                            <>
                                                                <h3 className="font-bold text-gray-900 dark:text-white truncate text-base">{friend.name || friend.email.split('@')[0]}</h3>
                                                                <p className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">{friend.email}</p>
                                                            </>
                                                        )}
                                                    </div>
                                                </div>
                                                {editingFriendId !== String(friend.id) && (
                                                    <div className="flex items-center shrink-0 ml-2">
                                                        <button onClick={() => {
                                                            setEditingFriendId(String(friend.id));
                                                            setEditFriendEmail(friend.email);
                                                        }} className="p-2 text-gray-400 hover:text-blue-500 bg-gray-50 dark:bg-black rounded-lg transition-colors">
                                                            <Edit2 className="w-4 h-4" />
                                                        </button>
                                                        <button onClick={() => handleDeleteFriend(String(friend.id))} className="p-2 text-gray-400 hover:text-red-500 bg-gray-50 dark:bg-black rounded-lg transition-colors ml-2">
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ) : null}
                    </motion.div>
                </AnimatePresence>
            </div>
        </div>
    );
}
