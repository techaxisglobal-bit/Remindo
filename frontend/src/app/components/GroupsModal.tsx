import { fetchWithAuth } from '../../utils/apiClient';
import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, Edit2, Users } from 'lucide-react';
import { Button } from './ui/button';
import { Group } from '../types';
import { Friend } from './CreateReminder';
import { API_BASE_URL } from '../api';
import { toast } from 'sonner';

interface GroupsModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function GroupsModal({ isOpen, onClose }: GroupsModalProps) {
    const [groups, setGroups] = useState<Group[]>([]);
    const [friends, setFriends] = useState<Friend[]>([]);
    const [activeTab, setActiveTab] = useState<'groups' | 'friends'>('groups');
    const [isLoading, setIsLoading] = useState(true);
    const [editingGroup, setEditingGroup] = useState<Group | null>(null);
    const [groupName, setGroupName] = useState('');
    const [members, setMembers] = useState<string[]>([]);
    const [memberInput, setMemberInput] = useState('');
    const [isFormVisible, setIsFormVisible] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen) fetchGroups();
    }, [isOpen]);

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

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white dark:bg-[#0a0a0a] rounded-2xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                <div className="p-4 border-b border-gray-100 dark:border-white/[0.04] dark:shadow-[0_2px_8px_rgba(0,0,0,0.5)] flex justify-between items-center bg-gray-50/50 dark:bg-[#0a0a0a]">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <Users className="w-5 h-5 text-[#e0b596]" /> My Contacts
                    </h2>
                    <button onClick={onClose} className="p-2 hover:bg-gray-200 dark:hover:bg-black rounded-full transition-colors text-gray-400">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-4 flex-1 overflow-y-auto custom-scrollbar">
                    {isFormVisible ? (
                        <form onSubmit={handleSaveGroup} className="space-y-4">
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Group Name</label>
                                <input
                                    type="text"
                                    value={groupName}
                                    onChange={e => setGroupName(e.target.value)}
                                    placeholder="e.g. Family, Work Team"
                                    className="w-full bg-gray-50 dark:bg-[#0a0a0a] border border-gray-200 dark:border-white/10 rounded-xl px-4 py-2 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-[#e0b596] outline-none transition-all"
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
                                        className="flex-1 bg-gray-50 dark:bg-[#0a0a0a] border border-gray-200 dark:border-white/10 rounded-xl px-4 py-2 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-[#e0b596] outline-none transition-all"
                                    />
                                    <Button type="button" onClick={handleAddMember} className="bg-[#e0b596] hover:bg-[#d4a37f] text-white px-4 rounded-xl">Add</Button>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {members.map(member => (
                                        <div key={member} className="bg-gray-100 dark:bg-[#0a0a0a] px-3 py-1 rounded-full text-xs flex items-center gap-1.5 text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-transparent dark:shadow-[0_2px_8px_rgba(0,0,0,0.5)]">
                                            {member}
                                            <button type="button" onClick={() => handleRemoveMember(member)} className="text-gray-400 hover:text-red-500">
                                                <X className="w-3 h-3" />
                                            </button>
                                        </div>
                                    ))}
                                    {members.length === 0 && <span className="text-xs text-gray-500">No members added yet</span>}
                                </div>
                            </div>

                            <div className="flex gap-3 pt-4">
                                <Button type="button" onClick={resetForm} variant="ghost" className="flex-1">Cancel</Button>
                                <Button type="submit" className="flex-1 bg-[#e0b596] hover:bg-[#d4a37f] text-white">Save Group</Button>
                            </div>
                        </form>
                    ) : (
                        <>
                            <div className="flex items-center border-b border-gray-100 dark:border-white/[0.04] mb-4">
                                <button
                                    onClick={() => setActiveTab('groups')}
                                    className={`flex-1 py-2 text-sm font-bold text-center transition-colors ${activeTab === 'groups' ? 'text-[#e0b596] border-b-2 border-[#e0b596]' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
                                >
                                    Groups
                                </button>
                                <button
                                    onClick={() => setActiveTab('friends')}
                                    className={`flex-1 py-2 text-sm font-bold text-center transition-colors ${activeTab === 'friends' ? 'text-[#e0b596] border-b-2 border-[#e0b596]' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
                                >
                                    Friends
                                </button>
                            </div>

                            {activeTab === 'groups' && (
                                <div className="mb-4">
                                    <Button onClick={() => setIsFormVisible(true)} className="w-full bg-[#e0b596] hover:bg-[#d4a37f] text-white flex items-center gap-2">
                                        <Plus className="w-4 h-4" /> Create New Group
                                    </Button>
                                </div>
                            )}

                            {isLoading ? (
                                <div className="text-center text-gray-500 py-8">Loading...</div>
                            ) : error ? (
                                <div className="text-center text-gray-500 py-8">
                                    <div className="w-12 h-12 mx-auto text-red-400 mb-3 flex items-center justify-center">
                                        <X className="w-8 h-8" />
                                    </div>
                                    <p className="text-red-500 mb-4">{error}</p>
                                    <Button onClick={fetchGroups} className="mx-auto bg-gray-100 hover:bg-gray-200 text-gray-800 dark:bg-[#0a0a0a] dark:text-gray-200 border border-gray-300 dark:border-white/10 rounded-xl px-6">Try Again</Button>
                                </div>
                            ) : activeTab === 'groups' ? (
                                groups.length === 0 ? (
                                    <div className="text-center text-gray-500 py-8">
                                        <Users className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600 mb-3" />
                                        <p>You haven't created any groups yet.</p>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {groups.map(group => (
                                            <div key={group.id} className="bg-gray-50 dark:bg-[#0a0a0a] p-4 rounded-xl border border-gray-100 dark:border-white/[0.04] dark:shadow-[0_2px_8px_rgba(0,0,0,0.5)] flex justify-between items-center group-hover:border-[#e0b596]/30 transition-all">
                                                <div>
                                                    <h3 className="font-bold text-gray-900 dark:text-white">{group.name}</h3>
                                                    <p className="text-xs text-gray-500 dark:text-gray-400">{group.members?.length || 0} members</p>
                                                </div>
                                                <div className="flex gap-2">
                                                    <button onClick={() => handleEditGroup(group)} className="p-2 text-gray-400 hover:text-[#e0b596] bg-white dark:bg-[#0a0a0a] rounded-lg shadow-sm border border-gray-100 dark:border-transparent dark:shadow-[0_2px_8px_rgba(0,0,0,0.5)] transition-colors">
                                                        <Edit2 className="w-4 h-4" />
                                                    </button>
                                                    <button onClick={() => handleDeleteGroup(group.id)} className="p-2 text-gray-400 hover:text-red-500 bg-white dark:bg-[#0a0a0a] rounded-lg shadow-sm border border-gray-100 dark:border-transparent dark:shadow-[0_2px_8px_rgba(0,0,0,0.5)] transition-colors">
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )
                            ) : (
                                friends.length === 0 ? (
                                    <div className="text-center text-gray-500 py-8">
                                        <Users className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600 mb-3" />
                                        <p>No friends yet &mdash; invite someone to a task to add them here!</p>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {friends.map(friend => (
                                            <div key={friend.id} className="bg-gray-50 dark:bg-[#0a0a0a] p-4 rounded-xl border border-gray-100 dark:border-white/[0.04] dark:shadow-[0_2px_8px_rgba(0,0,0,0.5)] flex justify-between items-center group-hover:border-[#e0b596]/30 transition-all">
                                                <div>
                                                    <h3 className="font-bold text-gray-900 dark:text-white">{friend.name || friend.email.split('@')[0]}</h3>
                                                    <p className="text-xs text-gray-500 dark:text-gray-400">{friend.email}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
