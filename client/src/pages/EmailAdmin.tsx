import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Mail, Users, TrendingUp, Download, Calendar, School } from 'lucide-react';

export default function EmailAdmin() {
  const { toast } = useToast();
  const [analytics, setAnalytics] = useState<any>(null);
  const [recentSignups, setRecentSignups] = useState<any[]>([]);
  const [emailList, setEmailList] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Export filters
  const [filters, setFilters] = useState({
    minLevel: '',
    minPoints: '',
    lawSchool: '',
    activeInLastDays: '30'
  });

  // Fetch email analytics
  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/email-analytics', {
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        setAnalytics(data);
      } else {
        toast({
          title: "Access Denied",
          description: "Admin access required to view email analytics",
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch email analytics",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // Fetch recent signups
  const fetchRecentSignups = async (days: number = 7) => {
    try {
      const response = await fetch(`/api/admin/recent-signups?days=${days}`, {
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        setRecentSignups(data);
      }
    } catch (error) {
      console.error("Failed to fetch recent signups:", error);
    }
  };

  // Export email list
  const exportEmails = async () => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams();
      if (filters.minLevel) queryParams.append('minLevel', filters.minLevel);
      if (filters.minPoints) queryParams.append('minPoints', filters.minPoints);
      if (filters.lawSchool) queryParams.append('lawSchool', filters.lawSchool);
      if (filters.activeInLastDays) queryParams.append('activeInLastDays', filters.activeInLastDays);
      
      const response = await fetch(`/api/admin/export-emails?${queryParams}`, {
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        setEmailList(data);
        
        // Download as CSV
        const csv = convertToCSV(data);
        downloadCSV(csv, 'law-duel-emails.csv');
        
        toast({
          title: "Export Successful",
          description: `Exported ${data.length} email addresses`,
        });
      }
    } catch (error) {
      toast({
        title: "Export Failed",
        description: "Failed to export email list",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // Convert to CSV format
  const convertToCSV = (data: any[]) => {
    if (data.length === 0) return '';
    
    const headers = ['Email', 'Username', 'Display Name', 'Law School', 'Level', 'Points', 'Daily Streak', 'Last Login'];
    const rows = data.map(user => [
      user.email,
      user.username,
      user.displayName,
      user.lawSchool || '',
      user.level,
      user.points,
      user.dailyStreak,
      user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleDateString() : 'Never'
    ]);
    
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');
    
    return csvContent;
  };

  // Download CSV file
  const downloadCSV = (csv: string, filename: string) => {
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  useEffect(() => {
    fetchAnalytics();
    fetchRecentSignups();
  }, []);

  if (loading && !analytics) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-4">
        <div className="container mx-auto">
          <div className="flex items-center justify-center h-screen">
            <div className="animate-spin w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-4">
      <div className="container mx-auto">
        <h1 className="text-3xl font-cinzel text-purple-200 mb-6 flex items-center gap-2">
          <Mail className="w-8 h-8" />
          Email Analytics Dashboard
        </h1>

        {analytics && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <Card className="bg-black/40 border-purple-500/30">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-purple-300 flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  Total Users
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-purple-200">{analytics.totalUsers}</div>
                <p className="text-xs text-slate-400">Platform total</p>
              </CardContent>
            </Card>

            <Card className="bg-black/40 border-purple-500/30">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-purple-300 flex items-center gap-2">
                  <Mail className="w-4 h-4" />
                  Users with Emails
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-purple-200">{analytics.usersWithEmail}</div>
                <p className="text-xs text-slate-400">Capture rate: {analytics.emailCaptureRate}</p>
              </CardContent>
            </Card>

            <Card className="bg-black/40 border-purple-500/30">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-purple-300 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4" />
                  Active Users
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-purple-200">{analytics.activeUsersWithEmail}</div>
                <p className="text-xs text-slate-400">Last 7 days</p>
              </CardContent>
            </Card>

            <Card className="bg-black/40 border-purple-500/30">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-purple-300 flex items-center gap-2">
                  <School className="w-4 h-4" />
                  Top Performers
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-purple-200">{analytics.topPerformers.count}</div>
                <p className="text-xs text-slate-400">Avg Level: {analytics.topPerformers.avgLevel}</p>
              </CardContent>
            </Card>
          </div>
        )}

        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList className="bg-black/40">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="signups">Recent Signups</TabsTrigger>
            <TabsTrigger value="export">Export Emails</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            {analytics && (
              <>
                <Card className="bg-black/40 border-purple-500/30">
                  <CardHeader>
                    <CardTitle className="text-purple-200">Engagement Metrics</CardTitle>
                  </CardHeader>
                  <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <p className="text-sm text-purple-300">Avg Questions</p>
                      <p className="text-xl font-bold text-purple-200">{analytics.engagement.avgQuestionsAnswered}</p>
                    </div>
                    <div>
                      <p className="text-sm text-purple-300">Correct Rate</p>
                      <p className="text-xl font-bold text-purple-200">{analytics.engagement.avgCorrectRate}</p>
                    </div>
                    <div>
                      <p className="text-sm text-purple-300">Avg Streak</p>
                      <p className="text-xl font-bold text-purple-200">{analytics.engagement.avgDailyStreak}</p>
                    </div>
                    <div>
                      <p className="text-sm text-purple-300">Max Streak</p>
                      <p className="text-xl font-bold text-purple-200">{analytics.engagement.maxDailyStreak}</p>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-black/40 border-purple-500/30">
                  <CardHeader>
                    <CardTitle className="text-purple-200">Law School Distribution</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {analytics.lawSchoolDistribution.map((school: any, index: number) => (
                        <div key={index} className="flex justify-between items-center">
                          <span className="text-purple-300">{school.lawSchool}</span>
                          <span className="text-purple-200 font-semibold">{school.count} users</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </>
            )}
          </TabsContent>

          <TabsContent value="signups" className="space-y-4">
            <Card className="bg-black/40 border-purple-500/30">
              <CardHeader>
                <CardTitle className="text-purple-200 flex items-center gap-2">
                  <Calendar className="w-5 h-5" />
                  Recent Signups (Last 7 Days)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {recentSignups.map((user: any) => (
                    <div key={user.id} className="flex justify-between items-center p-2 border-b border-purple-500/20">
                      <div>
                        <p className="text-purple-200 font-semibold">{user.username}</p>
                        <p className="text-sm text-slate-400">{user.email}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-purple-300">{user.lawSchool || 'No school'}</p>
                        <p className="text-xs text-slate-400">
                          {new Date(user.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  ))}
                  {recentSignups.length === 0 && (
                    <p className="text-center text-slate-400 py-4">No recent signups</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="export" className="space-y-4">
            <Card className="bg-black/40 border-purple-500/30">
              <CardHeader>
                <CardTitle className="text-purple-200">Export Email List</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-purple-300">Minimum Level</Label>
                    <Input
                      type="number"
                      placeholder="e.g., 5"
                      value={filters.minLevel}
                      onChange={(e) => setFilters({...filters, minLevel: e.target.value})}
                      className="bg-slate-800 border-purple-500/30 text-slate-200"
                    />
                  </div>
                  <div>
                    <Label className="text-purple-300">Minimum Points</Label>
                    <Input
                      type="number"
                      placeholder="e.g., 100"
                      value={filters.minPoints}
                      onChange={(e) => setFilters({...filters, minPoints: e.target.value})}
                      className="bg-slate-800 border-purple-500/30 text-slate-200"
                    />
                  </div>
                  <div>
                    <Label className="text-purple-300">Law School</Label>
                    <Input
                      type="text"
                      placeholder="e.g., Harvard Law School"
                      value={filters.lawSchool}
                      onChange={(e) => setFilters({...filters, lawSchool: e.target.value})}
                      className="bg-slate-800 border-purple-500/30 text-slate-200"
                    />
                  </div>
                  <div>
                    <Label className="text-purple-300">Active in Last (Days)</Label>
                    <Input
                      type="number"
                      placeholder="e.g., 30"
                      value={filters.activeInLastDays}
                      onChange={(e) => setFilters({...filters, activeInLastDays: e.target.value})}
                      className="bg-slate-800 border-purple-500/30 text-slate-200"
                    />
                  </div>
                </div>
                
                <Button 
                  onClick={exportEmails}
                  disabled={loading}
                  className="w-full bg-purple-600 hover:bg-purple-700 text-white flex items-center justify-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  {loading ? 'Exporting...' : 'Export to CSV'}
                </Button>
                
                <p className="text-sm text-slate-400 text-center">
                  Exports email list based on filters. Leave fields empty to include all users.
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}