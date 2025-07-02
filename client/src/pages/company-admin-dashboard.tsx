import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Building,
  Video,
  Settings,
  Users,
  MessageSquare,
  LogOut,
  Plus,
  Play,
  Mic,
  Pause,
  Volume2,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { VideoMeeting } from "@/components/video-meeting";
import { UserManagementTable } from "@/components/user-management-table";

// Type definitions
interface User {
  id: number;
  firstName: string;
  lastName: string;
  companyId: number;
  email?: string;
  role?: string;
}

interface Company {
  id: number;
  name: string;
  zoomMeetingId?: string;
  zoomMeetingUrl?: string;
  zoomMeetingPassword?: string;
}

interface Message {
  id: number;
  senderId: number;
  receiverId: number;
  companyId: number;
  messageType: "text" | "voice";
  content: string;
  isRead: boolean;
  createdAt: string;
}

interface Employee {
  id: number;
  firstName: string;
  lastName: string;
  email?: string;
  role?: string;
  companyId: number;
}

// Voice Message Component
interface VoiceMessageProps {
  audioUrl: string;
  isPlaying: boolean;
  onTogglePlay: () => void;
  duration?: string;
}

const VoiceMessage: React.FC<VoiceMessageProps> = ({
  audioUrl,
  isPlaying,
  onTogglePlay,
  duration = "0:00",
}) => {
  return (
    <div className="flex items-center space-x-2 bg-orange-50 p-2 rounded-lg">
      <Button
        variant="ghost"
        size="sm"
        onClick={onTogglePlay}
        className="text-orange-600 hover:text-orange-800 hover:bg-orange-100 p-1 h-8 w-8"
      >
        {isPlaying ? (
          <Pause className="h-4 w-4" />
        ) : (
          <Play className="h-4 w-4" />
        )}
      </Button>
      <div className="flex items-center space-x-2 flex-1">
        <Volume2 className="h-4 w-4 text-orange-600" />
        <div className="flex-1 bg-orange-200 h-2 rounded-full overflow-hidden">
          <div className="bg-orange-500 h-full w-1/3 rounded-full"></div>
        </div>
        <span className="text-xs text-orange-600 font-mono">{duration}</span>
      </div>
    </div>
  );
};

// Message Item Component
interface MessageItemProps {
  message: Message;
  sender: Employee | null;
  currentUser: User | null;
  onPlayVoice: (messageId: number, audioUrl: string) => void;
  playingMessageId: number | null;
}

const MessageItem: React.FC<MessageItemProps> = ({
  message,
  sender,
  currentUser,
  onPlayVoice,
  playingMessageId,
}) => {
  const isFromCurrentUser = message.senderId === currentUser?.id;
  const senderName = sender
    ? `${sender.firstName} ${sender.lastName}`
    : "Unknown User";
  const senderInitials = sender
    ? `${sender.firstName?.[0] || ""}${sender.lastName?.[0] || ""}`
    : "U";

  const handlePlayVoice = (): void => {
    if (message.messageType === "voice") {
      onPlayVoice(message.id, message.content);
    }
  };

  return (
    <div
      className={`p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors ${
        !message.isRead ? "bg-blue-50 border-blue-200" : ""
      }`}
    >
      {/* Message Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center space-x-2">
          <div
            className={`h-6 w-6 rounded-full flex items-center justify-center text-xs font-medium ${
              isFromCurrentUser
                ? "bg-orange-500 text-white"
                : "bg-green-500 text-white"
            }`}
          >
            {senderInitials}
          </div>
          <span className="font-medium text-gray-900 text-sm">
            {senderName}
          </span>
          {isFromCurrentUser && (
            <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
              You
            </span>
          )}
        </div>
        <span className="text-xs text-gray-500">
          {new Date(message.createdAt).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </span>
      </div>

      {/* Message Content */}
      <div className="mb-2">
        {message.messageType === "voice" ? (
          <VoiceMessage
            audioUrl={message.content}
            isPlaying={playingMessageId === message.id}
            onTogglePlay={handlePlayVoice}
            duration="0:05" // You can calculate actual duration
          />
        ) : (
          <p className="text-sm text-gray-700">{message.content}</p>
        )}
      </div>

      {/* Message Type Indicator */}
      <div className="flex items-center justify-between">
        <span
          className={`text-xs flex items-center ${
            message.messageType === "voice"
              ? "text-orange-600"
              : "text-blue-600"
          }`}
        >
          {message.messageType === "voice" ? (
            <>
              <Mic className="h-3 w-3 mr-1" />
              Voice Message
            </>
          ) : (
            <>
              <MessageSquare className="h-3 w-3 mr-1" />
              Text Message
            </>
          )}
        </span>
        {!message.isRead && (
          <div className="flex items-center">
            <div className="w-2 h-2 bg-blue-500 rounded-full mr-1"></div>
            <span className="text-xs text-blue-600">New</span>
          </div>
        )}
      </div>
    </div>
  );
};

const CompanyAdminDashboard: React.FC = () => {
  const { user, logoutMutation } = useAuth();
  const { toast } = useToast();
  const [meetingActive, setMeetingActive] = useState<boolean>(false);
  const [playingMessageId, setPlayingMessageId] = useState<number | null>(null);
  const [currentAudio, setCurrentAudio] = useState<HTMLAudioElement | null>(
    null
  );

  // Fetch company info
  const { data: companies = [] } = useQuery<Company[]>({
    queryKey: ["/api/companies"],
  });

  // Fetch employees
  const { data: employees = [] } = useQuery<Employee[]>({
    queryKey: ["/api/users"],
  });

  // Fetch messages
  const { data: messages = [] } = useQuery<Message[]>({
    queryKey: ["/api/messages"],
  });

  const company: Company | undefined = companies[0];
  const unreadMessages: Message[] = messages.filter(
    (msg: Message) => !msg.isRead
  );

  // Function to get sender info
  const getSenderInfo = (senderId: number): Employee | null => {
    return employees.find((emp) => emp.id === senderId) || null;
  };

const getApiBaseUrl = (): string => {
  if (typeof window !== 'undefined') {
    const { protocol, hostname, port } = window.location;
    
    if (hostname === 'localhost') {
    
      return `${protocol}//${hostname}:${port}`;
      
    }
    
    return `${protocol}//${hostname}${port ? ':' + port : ''}`;
  }
  
  return 'http://localhost:5000'; // Changed to match your frontend port
};

const handlePlayVoice = async (messageId: number, audioPath: string): Promise<void> => {
  try {
    // Stop current audio if playing
    if (currentAudio) {
      currentAudio.pause();
      currentAudio.currentTime = 0;
    }

    if (playingMessageId === messageId) {
      setPlayingMessageId(null);
      setCurrentAudio(null);
      return;
    }

    // Create the correct API URL for fetching audio
    let audioUrl: string;
    
    if (audioPath.startsWith('http')) {
      // If it's already a full URL, use it as is
      audioUrl = audioPath;
    } else {
      // Extract just the filename from the audioPath
      // audioPath might be like "/uploads/voice/filename.mp3" or just "filename.mp3"
      const filename = audioPath.includes('/') ? audioPath.split('/').pop() : audioPath;
      
      // Construct the API endpoint URL
      const baseUrl = getApiBaseUrl();
      audioUrl = `${baseUrl}/api/uploads/voice/${filename}`;
    }
    
    console.log('Attempting to play audio from:', audioUrl);

    // Check if browser supports audio formats
    const audio = new Audio();
    const supportedFormats = {
      mp3: audio.canPlayType('audio/mpeg'),
      wav: audio.canPlayType('audio/wav'),
      ogg: audio.canPlayType('audio/ogg'),
      webm: audio.canPlayType('audio/webm'),
      m4a: audio.canPlayType('audio/mp4')
    };
    
    console.log('Supported audio formats:', supportedFormats);

    // Try to fetch the audio file first to check headers and content
    try {
      const response = await fetch(audioUrl, {
        method: 'GET',
        credentials: 'include', // Include cookies for authentication
        headers: {
          'Accept': 'audio/*,*/*'
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const contentType = response.headers.get('content-type');
      const contentLength = response.headers.get('content-length');

      console.log('Response headers:', {
        contentType,
        contentLength,
        status: response.status
      });
      
      // Check if content-type is supported
      if (contentType && !contentType.startsWith('audio/')) {
        throw new Error(`Invalid content type: ${contentType}. Expected audio file.`);
      }
      
      // Check if file is too small (likely corrupted)
      if (contentLength && parseInt(contentLength) < 100) {
        throw new Error(`Audio file too small (${contentLength} bytes). Likely corrupted.`);
      }
      
      // Get the actual blob to verify it's a valid audio file
      const blob = await response.blob();
      console.log('Audio blob:', {
        size: blob.size,
        type: blob.type
      });
      
      // Create object URL from blob for more reliable playback
      const blobUrl = URL.createObjectURL(blob);
      
      // Create and configure audio element
      const audioElement = new Audio(blobUrl);
      
      // Set up event listeners
      audioElement.onloadstart = () => {
        console.log('Audio loading started');
        setPlayingMessageId(messageId);
      };

      audioElement.oncanplay = () => {
        console.log('Audio ready to play');
      };

      audioElement.onended = () => {
        console.log('Audio playback ended');
        setPlayingMessageId(null);
        setCurrentAudio(null);
        URL.revokeObjectURL(blobUrl); // Clean up blob URL
      };

      audioElement.onerror = (e) => {
        console.error('Audio playback error:', e);
        console.error('Audio error details:', {
          code: audioElement.error?.code,
          message: audioElement.error?.message,
          networkState: audioElement.networkState,
          readyState: audioElement.readyState
        });
        
        let errorMessage = 'Unknown audio error';
        if (audioElement.error) {
          switch (audioElement.error.code) {
            case 1: errorMessage = 'Audio loading was aborted'; break;
            case 2: errorMessage = 'Network error while loading audio'; break;
            case 3: errorMessage = 'Audio file is corrupted or cannot be decoded'; break;
            case 4: errorMessage = 'Audio format is not supported by this browser'; break;
          }
        }
        
        toast({
          title: "Audio Playback Error",
          description: `${errorMessage}. Please check if the audio file is valid.`,
          variant: "destructive",
        });
        
        setPlayingMessageId(null);
        setCurrentAudio(null);
        URL.revokeObjectURL(blobUrl); // Clean up blob URL
      };

      // Set volume and other properties
      audioElement.volume = 0.8;
      audioElement.preload = 'auto';

      setCurrentAudio(audioElement);
      
      // Try to play the audio
      const playPromise = audioElement.play();
      
      if (playPromise !== undefined) {
        playPromise.catch((error) => {
          console.error('Play promise rejected:', error);
          toast({
            title: "Playback Failed",
            description: "Could not start audio playback. The audio file may be corrupted or your browser doesn't support autoplay.",
            variant: "destructive",
          });
          setPlayingMessageId(null);
          setCurrentAudio(null);
          URL.revokeObjectURL(blobUrl);
        });
      }
      
    } catch (fetchError) {
      console.error('Failed to fetch audio file:', fetchError);
      let errorMessage = 'Could not load audio file';
      
      if (fetchError instanceof Error) {
        if (fetchError.message.includes('404')) {
          errorMessage = 'Audio file not found';
        } else if (fetchError.message.includes('403')) {
          errorMessage = 'Access denied to audio file';
        } else if (fetchError.message.includes('401')) {
          errorMessage = 'Authentication required';
        } else {
          errorMessage = fetchError.message;
        }
      }
      
      toast({
        title: "Audio File Error",
        description: errorMessage,
        variant: "destructive",
      });
      return;
    }
    
  } catch (error) {
    console.error('Voice playback error:', error);
    toast({
      title: "Playback Error",
      description: error instanceof Error ? error.message : 'Unknown error occurred',
      variant: "destructive",
    });
    setPlayingMessageId(null);
    setCurrentAudio(null);
  }
};

  // Create meeting mutation
  const createMeetingMutation = useMutation({
    mutationFn: async (): Promise<any> => {
      const res = await apiRequest("POST", "/api/zoom/create-meeting", {});
      return res.json();
    },
    onSuccess: () => {
      setMeetingActive(true);
      queryClient.invalidateQueries({ queryKey: ["/api/companies"] });
      toast({
        title: "Meeting Created",
        description: "Your 24/7 company meeting has been created successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleConnectMeeting = (): void => {
    if (company?.zoomMeetingUrl) {
      window.open(company.zoomMeetingUrl, "_blank");
    } else {
      createMeetingMutation.mutate();
    }
  };

  const handleLogout = (): void => {
    logoutMutation.mutate();
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <div className="bg-orange-500 text-white p-2 rounded-lg mr-3">
                <Building className="h-5 w-5" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-gray-900">
                  Company Admin Dashboard
                </h1>
                <p className="text-sm text-gray-600">
                  {company?.name || "Loading..."}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">
                {user?.firstName} {user?.lastName}
              </span>
              <div className="h-8 w-8 bg-orange-500 text-white rounded-full flex items-center justify-center text-sm font-medium">
                {user?.firstName?.[0]}
                {user?.lastName?.[0]}
              </div>
              <Button variant="ghost" size="sm" onClick={handleLogout}>
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {/* 24/7 Video Meeting */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Video className="h-5 w-5" />
              24/7 Company Meeting Room
            </CardTitle>
            <CardDescription>
              Always-on video meeting for your team - no need to create or
              schedule meetings
            </CardDescription>
          </CardHeader>
          <CardContent>
            <VideoMeeting
              meetingId={company?.zoomMeetingId || "123456789"}
              isHost={true}
            />
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Meeting Status */}
          <Card>
            <CardHeader>
              <CardTitle>Meeting Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Status</span>
                  <span
                    className={`px-3 py-1 text-sm rounded-full flex items-center ${
                      company?.zoomMeetingUrl
                        ? "bg-green-100 text-green-800"
                        : "bg-gray-100 text-gray-800"
                    }`}
                  >
                    <div
                      className={`w-2 h-2 rounded-full mr-2 ${
                        company?.zoomMeetingUrl ? "bg-green-500" : "bg-gray-500"
                      }`}
                    ></div>
                    {company?.zoomMeetingUrl ? "Active" : "Inactive"}
                  </span>
                </div>

                {company?.zoomMeetingUrl && (
                  <>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Meeting ID</span>
                      <span className="font-mono text-sm">
                        {company.zoomMeetingId}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Password</span>
                      <span className="font-mono text-sm">
                        {company.zoomMeetingPassword}
                      </span>
                    </div>
                  </>
                )}

                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Employees</span>
                  <span className="font-medium">{employees.length}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Employee Management */}
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>Employees</CardTitle>
                <Button size="sm" className="bg-green-600 hover:bg-green-700">
                  <Plus className="h-4 w-4 mr-1" />
                  Add
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 max-h-80 overflow-y-auto">
                {employees.length === 0 ? (
                  <p className="text-gray-500 text-center py-4">
                    No employees yet
                  </p>
                ) : (
                  employees.map((employee: Employee) => (
                    <div
                      key={employee.id}
                      className="flex items-center justify-between p-3 border border-gray-200 rounded-lg"
                    >
                      <div className="flex items-center">
                        <div className="h-8 w-8 bg-green-500 text-white rounded-full flex items-center justify-center text-xs font-medium mr-3">
                          {employee.firstName?.[0]}
                          {employee.lastName?.[0]}
                        </div>
                        <div>
                          <h4 className="font-medium text-gray-900">
                            {employee.firstName} {employee.lastName}
                          </h4>
                          <p className="text-xs text-gray-600">Active</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          {/* Enhanced Messages Panel */}
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>Messages</CardTitle>
                {unreadMessages.length > 0 && (
                  <span className="bg-red-100 text-red-800 text-xs px-2 py-1 rounded-full">
                    {unreadMessages.length} new
                  </span>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 max-h-96 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
                {messages.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">
                    No messages yet
                  </p>
                ) : (
                  messages
                    .sort(
                      (a, b) =>
                        new Date(b.createdAt).getTime() -
                        new Date(a.createdAt).getTime()
                    )
                    .map((message: Message) => (
                      <MessageItem
                        key={message.id}
                        message={message}
                        sender={getSenderInfo(message.senderId)}
                        currentUser={user}
                        onPlayVoice={handlePlayVoice}
                        playingMessageId={playingMessageId}
                      />
                    ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* User Management */}
        <div className="mt-6">
          <UserManagementTable
            users={employees}
            currentUserRole="company_admin"
            currentCompanyId={user?.companyId}
          />
        </div>
      </div>
    </div>
  );
};

export default CompanyAdminDashboard;
