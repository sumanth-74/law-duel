import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useLocation } from 'wouter';

const archetypes = [
  {
    id: "novice-scholar",
    name: "Novice Scholar",
    description: "Starting your legal journey with determination and fresh perspectives."
  },
  {
    id: "trial-hawk",
    name: "Trial Hawk", 
    description: "Aggressive litigator who thrives in courtroom combat."
  },
  {
    id: "constitutional-scholar",
    name: "Constitutional Scholar",
    description: "Deep thinker focused on fundamental legal principles."
  },
  {
    id: "corporate-counsel", 
    name: "Corporate Counsel",
    description: "Strategic advisor navigating complex business law."
  }
];

export default function CharacterCreation() {
  const [, setLocation] = useLocation();
  const [selectedArchetype, setSelectedArchetype] = useState("novice-scholar");
  const [displayName, setDisplayName] = useState('');
  const queryClient = useQueryClient();

  // Get current user to pre-fill display name
  const { data: user } = useQuery({
    queryKey: ['/api/auth/me'],
    retry: false
  });

  // Set default display name when user loads
  React.useEffect(() => {
    if (user && !displayName) {
      setDisplayName(user.username);
    }
  }, [user]);

  const updateProfileMutation = useMutation({
    mutationFn: async (profileData: any) => {
      return apiRequest(`/api/users/${user.id}`, {
        method: 'PATCH',
        body: JSON.stringify(profileData)
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/auth/me'] });
      setLocation('/'); // Go to home page after character creation
    }
  });

  const handleCreateCharacter = () => {
    if (!displayName.trim()) return;

    const avatarData = {
      archetype: selectedArchetype,
      accessories: [],
      level: 1
    };

    updateProfileMutation.mutate({
      displayName: displayName.trim(),
      avatarData
    });
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <p className="text-purple-200">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-4">
      <div className="container mx-auto max-w-4xl">
        <div className="text-center mb-8 pt-8">
          <h1 className="font-cinzel text-4xl md:text-5xl font-bold mb-4">
            <span className="bg-gradient-to-r from-purple-400 via-purple-300 to-purple-500 bg-clip-text text-transparent">
              Create Your Character
            </span>
          </h1>
          <p className="text-purple-200">Choose your legal archetype and name to begin your dueling journey.</p>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Character Info */}
          <Card className="bg-black/40 border-purple-500/30">
            <CardHeader>
              <CardTitle className="font-cinzel text-purple-200">Character Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-purple-300 mb-2">
                  Display Name
                </label>
                <Input
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Enter your display name"
                  className="bg-slate-800 border-purple-500/30 text-slate-200"
                />
                <p className="text-xs text-purple-400/60 mt-1">
                  This is how other players will see you
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-purple-300 mb-2">
                  Username: {user.username}
                </label>
                <p className="text-xs text-purple-400/60">
                  Your unique identifier for login
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Archetype Selection */}
          <Card className="bg-black/40 border-purple-500/30">
            <CardHeader>
              <CardTitle className="font-cinzel text-purple-200">Choose Your Archetype</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {archetypes.map((archetype) => (
                <div
                  key={archetype.id}
                  className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                    selectedArchetype === archetype.id
                      ? 'border-purple-500 bg-purple-500/20'
                      : 'border-purple-500/30 hover:border-purple-400/50'
                  }`}
                  onClick={() => setSelectedArchetype(archetype.id)}
                >
                  <h3 className="font-semibold text-purple-200">{archetype.name}</h3>
                  <p className="text-sm text-purple-300/80">{archetype.description}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Create Button */}
        <div className="text-center mt-8">
          <Button
            onClick={handleCreateCharacter}
            disabled={!displayName.trim() || updateProfileMutation.isPending}
            size="lg"
            className="bg-purple-600 hover:bg-purple-700 text-white px-12 py-3"
          >
            {updateProfileMutation.isPending ? 'Creating Character...' : 'Create Character & Start Dueling'}
          </Button>
        </div>
      </div>
    </div>
  );
}