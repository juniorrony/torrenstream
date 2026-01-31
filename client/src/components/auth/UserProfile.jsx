import React, { useState, useRef, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  CardHeader,
  Avatar,
  Typography,
  TextField,
  Button,
  IconButton,
  Grid,
  Divider,
  Switch,
  FormControlLabel,
  FormGroup,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Alert,
  Snackbar,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  LinearProgress,
  Chip,
  Tabs,
  Tab,
  Paper
} from '@mui/material';
import {
  Edit as EditIcon,
  PhotoCamera as CameraIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
  Delete as DeleteIcon,
  Security as SecurityIcon,
  Notifications as NotificationsIcon,
  Palette as ThemeIcon,
  Language as LanguageIcon,
  Verified as VerifiedIcon,
  Warning as WarningIcon
} from '@mui/icons-material';
import { useAuth } from '../../context/AuthContext';

const TabPanel = ({ children, value, index, ...other }) => (
  <div
    role="tabpanel"
    hidden={value !== index}
    id={`profile-tabpanel-${index}`}
    aria-labelledby={`profile-tab-${index}`}
    {...other}
  >
    {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
  </div>
);

const UserProfile = () => {
  const { 
    user, 
    updateProfile, 
    changePassword, 
    uploadAvatar, 
    deleteAvatar,
    isEmailVerified,
    permissions,
    roles
  } = useAuth();

  const [activeTab, setActiveTab] = useState(0);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [deleteAvatarDialog, setDeleteAvatarDialog] = useState(false);
  const fileInputRef = useRef();

  // Profile form state
  const [profileForm, setProfileForm] = useState({
    username: '',
    email: '',
    firstName: '',
    lastName: '',
    bio: '',
    location: '',
    website: '',
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
  });

  // Password change form
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  // Preferences state
  const [preferences, setPreferences] = useState({
    theme: 'auto',
    language: 'en',
    emailNotifications: true,
    pushNotifications: true,
    autoplay: true,
    defaultQuality: 'auto',
    subtitles: true,
    rememberProgress: true
  });

  useEffect(() => {
    if (user) {
      setProfileForm({
        username: user.username || '',
        email: user.email || '',
        firstName: user.profile?.first_name || '',
        lastName: user.profile?.last_name || '',
        bio: user.profile?.bio || '',
        location: user.profile?.location || '',
        website: user.profile?.website || '',
        timezone: user.profile?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone
      });
      
      // Load preferences from user profile or defaults
      setPreferences({
        theme: user.profile?.theme || 'auto',
        language: user.profile?.language || 'en',
        emailNotifications: user.profile?.email_notifications ?? true,
        pushNotifications: user.profile?.push_notifications ?? true,
        autoplay: user.profile?.autoplay ?? true,
        defaultQuality: user.profile?.default_quality || 'auto',
        subtitles: user.profile?.subtitles ?? true,
        rememberProgress: user.profile?.remember_progress ?? true
      });
    }
  }, [user]);

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  const handleProfileChange = (field, value) => {
    setProfileForm(prev => ({ ...prev, [field]: value }));
  };

  const handlePasswordChange = (field, value) => {
    setPasswordForm(prev => ({ ...prev, [field]: value }));
  };

  const handlePreferenceChange = (field, value) => {
    setPreferences(prev => ({ ...prev, [field]: value }));
  };

  const handleAvatarUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Validate file type and size
    if (!file.type.startsWith('image/')) {
      showSnackbar('Please select an image file', 'error');
      return;
    }

    if (file.size > 5 * 1024 * 1024) { // 5MB limit
      showSnackbar('Image must be smaller than 5MB', 'error');
      return;
    }

    setLoading(true);
    try {
      await uploadAvatar(file);
      showSnackbar('Avatar updated successfully', 'success');
    } catch (error) {
      showSnackbar(error.message || 'Failed to upload avatar', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAvatar = async () => {
    setLoading(true);
    try {
      await deleteAvatar();
      showSnackbar('Avatar removed successfully', 'success');
      setDeleteAvatarDialog(false);
    } catch (error) {
      showSnackbar(error.message || 'Failed to remove avatar', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    setLoading(true);
    try {
      await updateProfile({
        ...profileForm,
        preferences
      });
      setIsEditing(false);
      showSnackbar('Profile updated successfully', 'success');
    } catch (error) {
      showSnackbar(error.message || 'Failed to update profile', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async () => {
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      showSnackbar('New passwords do not match', 'error');
      return;
    }

    if (passwordForm.newPassword.length < 8) {
      showSnackbar('New password must be at least 8 characters long', 'error');
      return;
    }

    setLoading(true);
    try {
      await changePassword(passwordForm.currentPassword, passwordForm.newPassword);
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      showSnackbar('Password changed successfully', 'success');
    } catch (error) {
      showSnackbar(error.message || 'Failed to change password', 'error');
    } finally {
      setLoading(false);
    }
  };

  const showSnackbar = (message, severity = 'success') => {
    setSnackbar({ open: true, message, severity });
  };

  const getInitials = (name) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase();
  };

  if (!user) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 400 }}>
        <Typography>Please log in to view your profile</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto', p: 3 }}>
      <Card>
        <CardHeader
          title="User Profile"
          subheader="Manage your account settings and preferences"
        />
        
        {loading && <LinearProgress variant="indeterminate" />}
        
        <CardContent>
          <Tabs
            value={activeTab}
            onChange={handleTabChange}
            aria-label="profile tabs"
            sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}
          >
            <Tab label="Profile" icon={<EditIcon />} />
            <Tab label="Security" icon={<SecurityIcon />} />
            <Tab label="Preferences" icon={<ThemeIcon />} />
            <Tab label="Permissions" icon={<VerifiedIcon />} />
          </Tabs>

          {/* Profile Tab */}
          <TabPanel value={activeTab} index={0}>
            <Grid container spacing={3}>
              {/* Avatar Section */}
              <Grid item xs={12} md={4}>
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                  <Box sx={{ position: 'relative' }}>
                    <Avatar
                      src={user.avatarUrl}
                      sx={{ 
                        width: 120, 
                        height: 120,
                        fontSize: '2rem',
                        bgcolor: 'primary.main'
                      }}
                    >
                      {getInitials(user.username)}
                    </Avatar>
                    
                    {isEditing && (
                      <IconButton
                        sx={{
                          position: 'absolute',
                          bottom: 0,
                          right: 0,
                          bgcolor: 'background.paper',
                          boxShadow: 2,
                          '&:hover': { bgcolor: 'grey.100' }
                        }}
                        onClick={() => fileInputRef.current?.click()}
                        disabled={loading}
                      >
                        <CameraIcon />
                      </IconButton>
                    )}
                  </Box>

                  <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                    <Typography variant="h6">{profileForm.username}</Typography>
                    {isEmailVerified ? (
                      <VerifiedIcon color="success" fontSize="small" />
                    ) : (
                      <WarningIcon color="warning" fontSize="small" />
                    )}
                  </Box>

                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', justifyContent: 'center' }}>
                    {roles?.map(role => (
                      <Chip
                        key={role}
                        label={role}
                        size="small"
                        color={role === 'admin' ? 'error' : role === 'moderator' ? 'warning' : 'default'}
                      />
                    ))}
                  </Box>

                  {isEditing && user.avatarUrl && (
                    <Button
                      color="error"
                      startIcon={<DeleteIcon />}
                      onClick={() => setDeleteAvatarDialog(true)}
                      disabled={loading}
                    >
                      Remove Avatar
                    </Button>
                  )}

                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleAvatarUpload}
                    accept="image/*"
                    style={{ display: 'none' }}
                  />
                </Box>
              </Grid>

              {/* Profile Form */}
              <Grid item xs={12} md={8}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="h6">Profile Information</Typography>
                  <Box>
                    {isEditing ? (
                      <>
                        <Button
                          onClick={() => setIsEditing(false)}
                          disabled={loading}
                          sx={{ mr: 1 }}
                        >
                          Cancel
                        </Button>
                        <Button
                          variant="contained"
                          startIcon={<SaveIcon />}
                          onClick={handleSaveProfile}
                          disabled={loading}
                        >
                          Save Changes
                        </Button>
                      </>
                    ) : (
                      <Button
                        variant="outlined"
                        startIcon={<EditIcon />}
                        onClick={() => setIsEditing(true)}
                      >
                        Edit Profile
                      </Button>
                    )}
                  </Box>
                </Box>

                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Username"
                      value={profileForm.username}
                      onChange={(e) => handleProfileChange('username', e.target.value)}
                      disabled={!isEditing || loading}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Email"
                      type="email"
                      value={profileForm.email}
                      onChange={(e) => handleProfileChange('email', e.target.value)}
                      disabled={!isEditing || loading}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="First Name"
                      value={profileForm.firstName}
                      onChange={(e) => handleProfileChange('firstName', e.target.value)}
                      disabled={!isEditing || loading}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Last Name"
                      value={profileForm.lastName}
                      onChange={(e) => handleProfileChange('lastName', e.target.value)}
                      disabled={!isEditing || loading}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Bio"
                      multiline
                      rows={3}
                      value={profileForm.bio}
                      onChange={(e) => handleProfileChange('bio', e.target.value)}
                      disabled={!isEditing || loading}
                      placeholder="Tell us about yourself..."
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Location"
                      value={profileForm.location}
                      onChange={(e) => handleProfileChange('location', e.target.value)}
                      disabled={!isEditing || loading}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Website"
                      value={profileForm.website}
                      onChange={(e) => handleProfileChange('website', e.target.value)}
                      disabled={!isEditing || loading}
                      placeholder="https://..."
                    />
                  </Grid>
                </Grid>
              </Grid>
            </Grid>
          </TabPanel>

          {/* Security Tab */}
          <TabPanel value={activeTab} index={1}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Change Password
              </Typography>
              <Grid container spacing={2} sx={{ mt: 1 }}>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    type="password"
                    label="Current Password"
                    value={passwordForm.currentPassword}
                    onChange={(e) => handlePasswordChange('currentPassword', e.target.value)}
                    disabled={loading}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    type="password"
                    label="New Password"
                    value={passwordForm.newPassword}
                    onChange={(e) => handlePasswordChange('newPassword', e.target.value)}
                    disabled={loading}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    type="password"
                    label="Confirm New Password"
                    value={passwordForm.confirmPassword}
                    onChange={(e) => handlePasswordChange('confirmPassword', e.target.value)}
                    disabled={loading}
                  />
                </Grid>
                <Grid item xs={12}>
                  <Button
                    variant="contained"
                    onClick={handleChangePassword}
                    disabled={loading || !passwordForm.currentPassword || !passwordForm.newPassword}
                  >
                    Change Password
                  </Button>
                </Grid>
              </Grid>
            </Paper>
          </TabPanel>

          {/* Preferences Tab */}
          <TabPanel value={activeTab} index={2}>
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Paper sx={{ p: 3 }}>
                  <Box display="flex" alignItems="center" gap={1} mb={1}>
                    <ThemeIcon />
                    <Typography variant="h6">
                      Appearance
                    </Typography>
                  </Box>
                  <FormControl fullWidth sx={{ mb: 2 }}>
                    <InputLabel>Theme</InputLabel>
                    <Select
                      value={preferences.theme}
                      onChange={(e) => handlePreferenceChange('theme', e.target.value)}
                      disabled={loading}
                    >
                      <MenuItem value="light">Light</MenuItem>
                      <MenuItem value="dark">Dark</MenuItem>
                      <MenuItem value="auto">Auto (System)</MenuItem>
                    </Select>
                  </FormControl>
                  
                  <FormControl fullWidth>
                    <InputLabel>Language</InputLabel>
                    <Select
                      value={preferences.language}
                      onChange={(e) => handlePreferenceChange('language', e.target.value)}
                      disabled={loading}
                    >
                      <MenuItem value="en">English</MenuItem>
                      <MenuItem value="es">Español</MenuItem>
                      <MenuItem value="fr">Français</MenuItem>
                      <MenuItem value="de">Deutsch</MenuItem>
                    </Select>
                  </FormControl>
                </Paper>
              </Grid>

              <Grid item xs={12} md={6}>
                <Paper sx={{ p: 3 }}>
                  <Typography variant="h6" gutterBottom>
                    Notifications
                  </Typography>
                  <FormGroup>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={preferences.emailNotifications}
                          onChange={(e) => handlePreferenceChange('emailNotifications', e.target.checked)}
                          disabled={loading}
                        />
                      }
                      label="Email Notifications"
                    />
                    <FormControlLabel
                      control={
                        <Switch
                          checked={preferences.pushNotifications}
                          onChange={(e) => handlePreferenceChange('pushNotifications', e.target.checked)}
                          disabled={loading}
                        />
                      }
                      label="Push Notifications"
                    />
                  </FormGroup>
                </Paper>
              </Grid>

              <Grid item xs={12}>
                <Paper sx={{ p: 3 }}>
                  <Typography variant="h6" gutterBottom>
                    Streaming Preferences
                  </Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={6}>
                      <FormControl fullWidth>
                        <InputLabel>Default Quality</InputLabel>
                        <Select
                          value={preferences.defaultQuality}
                          onChange={(e) => handlePreferenceChange('defaultQuality', e.target.value)}
                          disabled={loading}
                        >
                          <MenuItem value="auto">Auto</MenuItem>
                          <MenuItem value="1080p">1080p</MenuItem>
                          <MenuItem value="720p">720p</MenuItem>
                          <MenuItem value="480p">480p</MenuItem>
                        </Select>
                      </FormControl>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <FormGroup>
                        <FormControlLabel
                          control={
                            <Switch
                              checked={preferences.autoplay}
                              onChange={(e) => handlePreferenceChange('autoplay', e.target.checked)}
                              disabled={loading}
                            />
                          }
                          label="Autoplay Next Episode"
                        />
                        <FormControlLabel
                          control={
                            <Switch
                              checked={preferences.subtitles}
                              onChange={(e) => handlePreferenceChange('subtitles', e.target.checked)}
                              disabled={loading}
                            />
                          }
                          label="Show Subtitles by Default"
                        />
                        <FormControlLabel
                          control={
                            <Switch
                              checked={preferences.rememberProgress}
                              onChange={(e) => handlePreferenceChange('rememberProgress', e.target.checked)}
                              disabled={loading}
                            />
                          }
                          label="Remember Watch Progress"
                        />
                      </FormGroup>
                    </Grid>
                  </Grid>
                </Paper>
              </Grid>

              <Grid item xs={12}>
                <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <Button
                    variant="contained"
                    startIcon={<SaveIcon />}
                    onClick={handleSaveProfile}
                    disabled={loading}
                  >
                    Save Preferences
                  </Button>
                </Box>
              </Grid>
            </Grid>
          </TabPanel>

          {/* Permissions Tab */}
          <TabPanel value={activeTab} index={3}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Your Permissions
              </Typography>
              
              {!isEmailVerified && (
                <Alert severity="warning" sx={{ mb: 2 }}>
                  Your email is not verified. Some features may be limited.
                </Alert>
              )}

              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle1" gutterBottom>
                    Roles
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
                    {roles?.map(role => (
                      <Chip
                        key={role}
                        label={role.charAt(0).toUpperCase() + role.slice(1)}
                        color={role === 'admin' ? 'error' : role === 'moderator' ? 'warning' : 'primary'}
                      />
                    ))}
                  </Box>
                </Grid>

                <Grid item xs={12}>
                  <Typography variant="subtitle1" gutterBottom>
                    Permissions ({permissions?.length || 0})
                  </Typography>
                  <Box sx={{ maxHeight: 300, overflow: 'auto' }}>
                    {permissions?.map(permission => (
                      <Chip
                        key={permission}
                        label={permission}
                        variant="outlined"
                        size="small"
                        sx={{ m: 0.5 }}
                      />
                    )) || (
                      <Typography variant="body2" color="text.secondary">
                        No specific permissions assigned
                      </Typography>
                    )}
                  </Box>
                </Grid>
              </Grid>
            </Paper>
          </TabPanel>
        </CardContent>
      </Card>

      {/* Delete Avatar Confirmation Dialog */}
      <Dialog
        open={deleteAvatarDialog}
        onClose={() => setDeleteAvatarDialog(false)}
      >
        <DialogTitle>Remove Avatar</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to remove your profile picture?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteAvatarDialog(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleDeleteAvatar}
            color="error"
            disabled={loading}
          >
            Remove
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default UserProfile;