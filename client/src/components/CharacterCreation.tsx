import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { AvatarRenderer } from './AvatarRenderer';
import { loadArchetypes, sanitizeUsername, validateAvatarData } from '@/lib/creator.js';
import { loadLawArchetypes } from '@/lib/lawArchetypes.js';
import type { AvatarData } from '@shared/schema';

interface CharacterCreationProps {
  isOpen: boolean;
  onClose: () => void;
  onCharacterCreated: (character: { username: string; displayName: string; lawSchool?: string; avatarData: AvatarData }) => void;
  editMode?: boolean;
  existingUser?: {
    username: string;
    displayName: string;
    lawSchool?: string;
    avatarData: AvatarData;
  };
}

interface ArchetypeData {
  bases: string[];
  palettes: Record<string, string>;
  props: string[];
  categories: Record<string, {
    name: string;
    description: string;
    icon: string;
  }>;
  archetypes: Array<{
    id: string;
    label: string;
    base: string;
    palette: string;
    props: string[];
    category: string;
  }>;
}

export function CharacterCreation({ isOpen, onClose, onCharacterCreated, editMode = false, existingUser }: CharacterCreationProps) {
  const [archetypes, setArchetypes] = useState<ArchetypeData>({ bases: [], palettes: {}, props: [], categories: {}, archetypes: [] });
  const [selectedCategory, setSelectedCategory] = useState<string>('corporate');
  const [selectedArchetype, setSelectedArchetype] = useState<string>('');
  const [customMode, setCustomMode] = useState(false);
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [lawSchool, setLawSchool] = useState('');
  const [customAvatarData, setCustomAvatarData] = useState<AvatarData>({
    base: 'humanoid',
    palette: '#5865f2',
    props: []
  });
  const [loading, setLoading] = useState(false);
  const [dataLoading, setDataLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setDataLoading(true);
      loadLawArchetypes().then((data) => {
        setArchetypes(data);
        setDataLoading(false);
      });
      
      // Initialize form with existing user data in edit mode
      if (editMode && existingUser) {
        setUsername(existingUser.username);
        setDisplayName(existingUser.displayName);
        setLawSchool(existingUser.lawSchool || '');
        
        // Find matching archetype if available
        const userArchetype = data.archetypes?.find(arch => 
          arch.label === existingUser.displayName
        );
        if (userArchetype) {
          setSelectedArchetype(userArchetype.id);
          setSelectedCategory(userArchetype.category);
        } else {
          setCustomMode(true);
          setCustomAvatarData(existingUser.avatarData);
        }
      }
    }
  }, [isOpen, editMode, existingUser]);

  const handleArchetypeSelect = (archetypeId: string) => {
    const archetype = archetypes.archetypes?.find(a => a.id === archetypeId);
    if (archetype) {
      setSelectedArchetype(archetypeId);
      setDisplayName(archetype.label);
      setCustomMode(false);
    }
  };

  const getCurrentAvatarData = (): AvatarData => {
    if (customMode) {
      return customAvatarData;
    }
    
    const archetype = archetypes.archetypes?.find(a => a.id === selectedArchetype);
    if (archetype) {
      return {
        archetypeId: archetype.id,
        base: archetype.base,
        palette: archetypes.palettes[archetype.palette] || archetype.palette,
        props: archetype.props
      };
    }
    
    return { base: 'humanoid', palette: '#5865f2', props: [] };
  };

  const handleSubmit = async () => {
    const cleanUsername = sanitizeUsername(username);
    const cleanDisplayName = displayName.trim();
    
    if (!cleanUsername || cleanUsername.length < 2) {
      setError('Username must be 2-18 characters, letters and spaces only');
      return;
    }
    
    if (!cleanDisplayName || cleanDisplayName.length < 2) {
      setError('Display name is required');
      return;
    }
    
    const avatarData = getCurrentAvatarData();
    if (!validateAvatarData(avatarData)) {
      setError('Invalid avatar configuration');
      return;
    }

    setLoading(true);
    setError('');
    
    try {
      onCharacterCreated({
        username: cleanUsername,
        displayName: cleanDisplayName,
        lawSchool: lawSchool.trim(),
        avatarData
      });
      onClose();
    } catch (err) {
      setError('Failed to create character. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const rollRandom = () => {
    if (!archetypes.archetypes || archetypes.archetypes.length === 0) return;
    const randomArchetype = archetypes.archetypes[Math.floor(Math.random() * archetypes.archetypes.length)];
    if (randomArchetype) {
      handleArchetypeSelect(randomArchetype.id);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4" data-testid="character-creation-modal">
      <Card className="panel max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <CardContent className="p-6">
          <div className="text-center mb-8">
            <h2 className="font-cinzel text-3xl font-bold mb-2">Choose Your Legal Career Path</h2>
            <p className="text-muted">Select a specialization that matches your legal ambitions</p>
          </div>
          
          {/* Preview */}
          <div className="flex justify-center mb-8">
            <AvatarRenderer 
              avatarData={getCurrentAvatarData()}
              level={1}
              size={120}
              className="mx-auto"
            />
          </div>
          
          {/* Career Category Selection */}
          {dataLoading ? (
            <div className="text-center py-12">
              <div className="w-8 h-8 border-2 border-arcane border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-muted">Loading career paths...</p>
            </div>
          ) : (
            <div className="space-y-6 mb-8">
              {/* Category Tabs */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {Object.entries(archetypes.categories || {}).map(([categoryId, category]) => (
                  <button
                    key={categoryId}
                    onClick={() => {
                      setSelectedCategory(categoryId);
                      setSelectedArchetype('');
                    }}
                    className={`p-4 rounded-xl border-2 transition-all duration-200 text-center ${
                      selectedCategory === categoryId 
                        ? 'border-arcane bg-arcane/10 text-arcane' 
                        : 'border-white/10 bg-panel hover:border-white/20'
                    }`}
                    data-testid={`category-${categoryId}`}
                  >
                    <div className="text-2xl mb-2">
                      {category.icon === 'gavel' && '⚖️'}
                      {category.icon === 'scales' && '🛡️'}
                      {category.icon === 'wings' && '⚔️'}
                      {category.icon === 'codex' && '📚'}
                    </div>
                    <h3 className="font-semibold text-sm mb-1">{category.name}</h3>
                    <p className="text-xs text-muted">{category.description}</p>
                  </button>
                ))}
              </div>

              {/* Characters in Selected Category */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-h-80 overflow-y-auto">
                {archetypes.archetypes
                  ?.filter(archetype => archetype.category === selectedCategory)
                  ?.map((archetype) => (
                  <div
                    key={archetype.id}
                    className={`archetype-card panel rounded-xl p-4 cursor-pointer transition-all duration-200 ${
                      selectedArchetype === archetype.id ? 'ring-2 ring-arcane' : ''
                    }`}
                    onClick={() => handleArchetypeSelect(archetype.id)}
                    data-testid={`archetype-${archetype.id}`}
                  >
                    <div className="text-center">
                      <AvatarRenderer
                        avatarData={{
                          archetypeId: archetype.id,
                          base: archetype.base,
                          palette: archetypes.palettes[archetype.palette] || archetype.palette,
                          props: archetype.props
                        }}
                        size={64}
                        className="mx-auto mb-3"
                      />
                      <h3 className="font-semibold mb-1">{archetype.label}</h3>
                    </div>
                  </div>
                )) || []}
              </div>
            </div>
          )}

          {/* Name Inputs */}
          <div className="space-y-4 mb-6">
            {!editMode && (
              <div>
                <Label htmlFor="username" className="block text-sm font-medium mb-2">
                  Username
                </Label>
                <Input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter your username..."
                  maxLength={18}
                  className="w-full"
                  data-testid="input-username"
                />
                <p className="text-xs text-muted mt-1">2-18 characters, letters and spaces only</p>
              </div>
            )}
            
            <div>
              <Label htmlFor="displayName" className="block text-sm font-medium mb-2">
                Display Name
              </Label>
              <Input
                id="displayName"
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Your character name..."
                maxLength={30}
                className="w-full"
                data-testid="input-display-name"
              />
            </div>
            
            <div>
              <Label htmlFor="lawSchool" className="block text-sm font-medium mb-2">
                Law School <span className="text-muted text-xs">(Optional)</span>
              </Label>
              <Input
                id="lawSchool"
                type="text"
                value={lawSchool}
                onChange={(e) => setLawSchool(e.target.value)}
                placeholder="e.g., Harvard Law School, Stanford Law..."
                maxLength={150}
                className="w-full"
                data-testid="input-law-school"
              />
            </div>
          </div>

          {error && (
            <div className="text-danger text-sm mb-4 text-center" data-testid="text-error">
              {error}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              onClick={handleSubmit}
              disabled={loading || (!editMode && !username) || !displayName || !selectedArchetype}
              className="btn-primary flex-1 py-3 px-6"
              data-testid="button-create-character"
            >
              {loading ? (editMode ? 'Updating...' : 'Creating...') : (editMode ? 'Update Character' : 'Enter the Arena')}
            </Button>
            {!editMode && (
              <Button
                onClick={rollRandom}
                variant="outline"
                className="py-3 px-6"
                data-testid="button-random-archetype"
              >
                Roll Random
              </Button>
            )}
            <Button
              onClick={onClose}
              variant="outline"
              className="py-3 px-6"
              data-testid="button-cancel"
            >
              Cancel
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
