import { useState } from 'react';
import { motion } from 'motion/react';
import { Button } from '@/app/components/ui/button';
import { Badge } from '@/app/components/ui/badge';
import { Input } from '@/app/components/ui/input';
import { MapPin, Navigation, Search, Star, Clock } from 'lucide-react';
import { Task, NearbyLocation } from '@/app/types';
import { getNearbyLocations } from '@/app/utils/mockData';

interface NearbyLocationsProps {
  tasks: Task[];
}

export function NearbyLocations({ tasks }: NearbyLocationsProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  // Get unique categories from upcoming tasks
  const categories = Array.from(new Set(tasks.map((t) => t.category)));
  
  // Automatically select first task's category if available
  const defaultCategory = tasks.length > 0 ? tasks[0].category : null;
  const activeCategory = selectedCategory || defaultCategory;
  
  // Get locations based on selected category or first task
  let locations: NearbyLocation[] = [];
  if (activeCategory) {
    locations = getNearbyLocations(activeCategory);
  }

  // Filter by search query
  if (searchQuery) {
    locations = locations.filter(
      (loc) =>
        loc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        loc.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
        loc.address.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }

  return (
    <div className="w-full">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6"
      >
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Nearby Locations
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          Find places related to your upcoming tasks
        </p>
      </motion.div>

      {/* Search Bar */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="mb-6"
      >
        <div className="relative dark:text-white">
          <Search className="absolute left-3 top-3 h-5 w-5 text-gray-400 dark:text-white" />
          <Input
            placeholder="Search locations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </motion.div>

      {/* Category Filters */}
      {categories.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mb-6"
        >
          <div className="flex flex-wrap gap-2 dark:text-white">
            <Button
              variant={selectedCategory === null ? 'default' : 'outline'}
              onClick={() => setSelectedCategory(null)}
              className={
                selectedCategory === null
                  ? "bg-gradient-to-r from-[#00AEEF] to-[#0A84FF] hover:from-[#0099D6] hover:to-[#006EDC]"
                  : ''
              }
            >
              All
            </Button>
            {categories.map((category) => (
              <Button
                key={category}
                variant={selectedCategory === category ? 'default' : 'outline'}
                onClick={() => setSelectedCategory(category)}
                className={
                  selectedCategory === category
                    ? "bg-gradient-to-r from-[#00AEEF] to-[#0A84FF] hover:from-[#0099D6] hover:to-[#006EDC]"
                    : ''
                }
              >
                {category.charAt(0).toUpperCase() + category.slice(1)}
              </Button>
            ))}
          </div>
        </motion.div>
      )}

      {/* Related Tasks */}
      {tasks.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mb-6 bg-purple-50 dark:bg-gray-500/20 rounded-xl p-4 border border-purple-200 dark:border-gray-800"
        >
          <h3 className="font-semibold text-[#075f71]  dark:text-white mb-3 flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Related Upcoming Tasks
          </h3>
          <div className="space-y-2">
            {tasks.slice(0, 3).map((task) => (
              <div
                key={task.id}
                className="flex items-center justify-between text-sm"
              >
                <span className="text-[#075f71]  dark:text-white">
                  {task.title}
                </span>
                <Badge className=" bg-[#E6F9FC] border-white dark:bg-gray-800 text-[#00A6C8] dark:text-white">
                  {task.category}
                </Badge>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Locations List */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="space-y-4"
      >
        {locations.length > 0 ? (
          locations.map((location, index) => (
            <motion.div
              key={location.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 * index }}
              className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-12 h-12 bg-gradient-to-r from-[#00AEEF] to-[#0A84FF] hover:from-[#0099D6] hover:to-[#006EDC] rounded-xl flex items-center justify-center">
                      <MapPin className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        {location.name}
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {location.category}
                      </p>
                    </div>
                    {location.isOpen ? (
                      <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                        Open
                      </Badge>
                    ) : (
                      <Badge className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
                        Closed
                      </Badge>
                    )}
                  </div>

                  <div className="space-y-2 mb-4">
                    <div className="flex items-start gap-2 text-gray-600 dark:text-gray-400">
                      <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" />
                      <span className="text-sm">{location.address}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1">
                      <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        {location.rating}
                      </span>
                    </div>
                    <div className="text-[#00A6C8] dark:text-gray-400 hover:text-[#008FB0] ">
                      {location.distance} away
                    </div>
                  </div>
                </div>

                <Button
                  className="px-3 py-1 bg-[#E6F9FC] border text-[#00A6C8] text-sm font-medium dark:bg-gray-800 dark:text-white "
                  onClick={() => {
                    window.open(
                      `https://www.google.com/maps/search/${encodeURIComponent(
                        location.name + ' ' + location.address
                      )}`,
                      '_blank'
                    );
                  }}
                >
                  <Navigation className="w-4 h-4 mr-2 dark:text-white" />
                  Navigate
                </Button>
              </div>
            </motion.div>
          ))
        ) : (
          <div className="text-center py-12 text-gray-400 dark:text-gray-500">
            <MapPin className="w-16 h-16 mx-auto mb-3 opacity-50" />
            <p className="text-lg">No locations found</p>
            <p className="text-sm mt-2">
              {tasks.length === 0
                ? 'Create a reminder to see nearby locations'
                : 'Try a different search or category'}
            </p>
          </div>
        )}
      </motion.div>
    </div>
  );
}