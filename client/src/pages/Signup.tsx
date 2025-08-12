import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import LawDuelLogo from '@/components/LawDuelLogo';
import { useLocation } from 'wouter';
import { useQueryClient } from '@tanstack/react-query';

import { LAW_ARCHETYPES } from '@/lib/lawArchetypes';
import { getCharacterImage, renderAvatarSVG } from '@/lib/creator';

const categories = LAW_ARCHETYPES.categories;

const lawSchools = [
  "Harvard Law School",
  "Yale Law School", 
  "Stanford Law School",
  "Columbia Law School",
  "University of Chicago Law School",
  "New York University School of Law",
  "University of Pennsylvania Law School",
  "University of Virginia School of Law",
  "University of Michigan Law School",
  "Duke University School of Law",
  "Northwestern University Pritzker School of Law",
  "Georgetown University Law Center",
  "Cornell Law School",
  "University of California, Berkeley School of Law",
  "Washington University School of Law",
  "Vanderbilt University Law School",
  "University of California, Los Angeles School of Law",
  "Boston University School of Law",
  "Emory University School of Law",
  "George Washington University Law School",
  "Other"
];

export default function Signup() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const [isCreating, setIsCreating] = useState(false);
  const [formData, setFormData] = useState({
    username: '',
    displayName: '',
    password: '',
    confirmPassword: '',
    lawSchool: '',
    selectedCategory: '',
    selectedCharacter: ''
  });

  const [step, setStep] = useState(1); // 1: Category selection, 2: Character selection

  // Get username from URL params
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const username = urlParams.get('username');
    if (username) {
      setFormData(prev => ({
        ...prev,
        username,
        displayName: username
      }));
    }
  }, []);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleCategorySelect = (categoryId: string) => {
    setFormData(prev => ({ ...prev, selectedCategory: categoryId, selectedCharacter: '' }));
    setStep(2);
  };

  const handleCharacterSelect = (characterId: string) => {
    setFormData(prev => ({ ...prev, selectedCharacter: characterId }));
  };

  const getCharactersForCategory = (categoryId: string) => {
    return LAW_ARCHETYPES.archetypes.filter(char => char.category === categoryId);
  };

  const getSelectedCharacterData = () => {
    return LAW_ARCHETYPES.archetypes.find(char => char.id === formData.selectedCharacter);
  };

  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (formData.password !== formData.confirmPassword) {
      alert('Passwords do not match');
      return;
    }
    
    if (formData.password.length < 6) {
      alert('Password must be at least 6 characters');
      return;
    }

    setIsCreating(true);

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          username: formData.username,
          displayName: formData.displayName,
          password: formData.password,
          confirmPassword: formData.confirmPassword,
          lawSchool: formData.lawSchool,
          avatarData: {
            archetype: formData.selectedCharacter,
            accessories: [],
            level: 1
          }
        })
      });

      if (response.ok) {
        // Invalidate auth query to trigger login state
        queryClient.invalidateQueries({ queryKey: ['/api/auth/me'] });
        // Redirect to home
        setLocation('/');
      } else {
        const error = await response.json();
        alert(error.message || 'Failed to create account');
      }
    } catch (error) {
      alert('Failed to create account. Please try again.');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-4">
      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 bg-black/20 backdrop-blur-sm border-b border-purple-500/20">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <LawDuelLogo size="md" showText={true} />
          <Button 
            onClick={() => setLocation('/')} 
            variant="ghost"
            className="text-purple-300 hover:text-purple-200"
          >
            Back
          </Button>
        </div>
      </nav>

      <div className="container mx-auto max-w-4xl pt-24">
        <div className="text-center mb-8">
          <h1 className="font-cinzel text-4xl md:text-5xl font-bold mb-4">
            <span className="bg-gradient-to-r from-purple-400 via-purple-300 to-purple-500 bg-clip-text text-transparent">
              Create Your Account
            </span>
          </h1>
          <p className="text-purple-200">Join Law Duel and start your competitive legal education journey</p>
        </div>

        <form onSubmit={handleCreateAccount} className="grid md:grid-cols-2 gap-8">
          {/* Account Information */}
          <Card className="bg-black/40 border-purple-500/30">
            <CardHeader>
              <CardTitle className="font-cinzel text-purple-200">Account Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-purple-300">Username</Label>
                <Input
                  value={formData.username}
                  onChange={(e) => handleInputChange('username', e.target.value)}
                  className="bg-slate-800 border-purple-500/30 text-slate-200"
                  disabled
                />
              </div>

              <div>
                <Label className="text-purple-300">Display Name</Label>
                <Input
                  value={formData.displayName}
                  onChange={(e) => handleInputChange('displayName', e.target.value)}
                  placeholder="How you'll appear to other players"
                  className="bg-slate-800 border-purple-500/30 text-slate-200"
                  required
                />
              </div>

              <div>
                <Label className="text-purple-300">Password</Label>
                <Input
                  type="password"
                  value={formData.password}
                  onChange={(e) => handleInputChange('password', e.target.value)}
                  placeholder="At least 6 characters"
                  className="bg-slate-800 border-purple-500/30 text-slate-200"
                  required
                />
              </div>

              <div>
                <Label className="text-purple-300">Confirm Password</Label>
                <Input
                  type="password"
                  value={formData.confirmPassword}
                  onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                  placeholder="Confirm your password"
                  className="bg-slate-800 border-purple-500/30 text-slate-200"
                  required
                />
              </div>

              <div>
                <Label className="text-purple-300">Law School</Label>
                <Select value={formData.lawSchool} onValueChange={(value) => handleInputChange('lawSchool', value)}>
                  <SelectTrigger className="bg-slate-800 border-purple-500/30 text-slate-200">
                    <SelectValue placeholder="Select your law school" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-purple-500/30">
                    {lawSchools.map((school) => (
                      <SelectItem key={school} value={school} className="text-slate-200">
                        {school}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Character Selection */}
          <Card className="bg-black/40 border-purple-500/30">
            <CardHeader>
              <CardTitle className="font-cinzel text-purple-200">
                {step === 1 ? 'Choose Your Legal Practice Area' : 'Select Your Character'}
              </CardTitle>
              {step === 2 && (
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => setStep(1)}
                  className="text-purple-400 hover:text-purple-300"
                >
                  ← Back to Categories
                </Button>
              )}
            </CardHeader>
            <CardContent className="space-y-3">
              {step === 1 ? (
                // Category Selection
                Object.entries(categories).map(([categoryId, category]) => (
                  <div
                    key={categoryId}
                    className={`p-4 rounded-lg border cursor-pointer transition-colors ${
                      formData.selectedCategory === categoryId
                        ? 'border-purple-500 bg-purple-500/20'
                        : 'border-purple-500/30 hover:border-purple-400/50'
                    }`}
                    onClick={() => handleCategorySelect(categoryId)}
                  >
                    <h3 className="font-semibold text-purple-200 flex items-center gap-2">
                      <span className="text-lg">⚖️</span>
                      {category.name}
                    </h3>
                    <p className="text-sm text-purple-300/80">{category.description}</p>
                  </div>
                ))
              ) : (
                // Character Selection
                <div className="space-y-3">
                  {getCharactersForCategory(formData.selectedCategory).map((character) => (
                    <div
                      key={character.id}
                      className={`p-3 rounded-lg border cursor-pointer transition-colors flex items-center gap-3 ${
                        formData.selectedCharacter === character.id
                          ? 'border-purple-500 bg-purple-500/20'
                          : 'border-purple-500/30 hover:border-purple-400/50'
                      }`}
                      onClick={() => handleCharacterSelect(character.id)}
                    >
                      <div className="w-12 h-12 flex-shrink-0">
                        <img 
                          src={getCharacterImage(character.base, character.id)} 
                          alt={character.label}
                          className="w-full h-full rounded-lg object-cover border border-purple-500/30"
                        />
                      </div>
                      <div className="flex-grow">
                        <h3 className="font-semibold text-purple-200">{character.label}</h3>
                        <p className="text-xs text-purple-300/60">
                          {character.base} • {LAW_ARCHETYPES.palettes[character.palette] ? character.palette.replace('_', ' ') : character.palette}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Submit Button */}
          <div className="md:col-span-2 text-center">
            <Button
              type="submit"
              disabled={
                isCreating || 
                !formData.username || 
                !formData.displayName || 
                !formData.password || 
                !formData.confirmPassword || 
                !formData.selectedCharacter ||
                !formData.lawSchool
              }
              size="lg"
              className="bg-purple-600 hover:bg-purple-700 text-white px-12 py-3"
            >
              {isCreating ? 'Creating Account...' : 'Create Account & Start Dueling'}
            </Button>
            
            {/* Character Preview */}
            {formData.selectedCharacter && (
              <div className="mt-6 text-center">
                <div className="inline-block p-4 bg-black/40 border border-purple-500/30 rounded-lg">
                  <h3 className="font-cinzel text-purple-200 mb-2">Your Character Preview</h3>
                  <div className="w-20 h-20 mx-auto mb-2">
                    <img 
                      src={getCharacterImage(getSelectedCharacterData()?.base, formData.selectedCharacter)} 
                      alt="Character preview"
                      className="w-full h-full rounded-lg object-cover border border-purple-500/30"
                    />
                  </div>
                  <p className="text-purple-300 font-medium">{getSelectedCharacterData()?.label}</p>
                  <p className="text-purple-400/60 text-sm">{formData.displayName} • {formData.lawSchool}</p>
                </div>
              </div>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}