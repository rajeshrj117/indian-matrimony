export type UserCard = {
  id: string;
  name: string;
  age: number;
  distance: string;
  bio: string;
  job: string;
  verified: boolean;
  online: boolean;
  images: string[];
  interests: string[];
  drinking: string;
  smoking: string;
  relationship: string;
  expectations: string;
  location: string;
};

export const MOCK_USERS: UserCard[] = [
  {
    id: '1',
    name: 'Aarav',
    age: 26,
    distance: '2 km away',
    bio: 'Coffee lover, weekend trekker. Looking for someone genuine who loves deep conversations and spontaneous drives.',
    job: 'Product Designer at Swiggy',
    verified: true,
    online: true,
    images: [
      'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800',
      'https://images.unsplash.com/vector-1742875355318-00d715aec3e8?q=80&w=400',
    ],
    interests: ['Travel', 'Photography', 'Gym', 'Indie Music'],
    drinking: 'Occasionally',
    smoking: 'No',
    relationship: 'Single',
    expectations: 'Long term relationship',
    location: 'Bandra, Mumbai',
  },
  {
    id: '2',
    name: 'Saanvi',
    age: 24,
    distance: '5 km away',
    bio: 'Architect who sketches cafes. Believer in slow dating, good books and great dosas.',
    job: 'Architect',
    verified: true,
    online: false,
    images: [
      'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=800',
      'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=800',
    ],
    interests: ['Architecture', 'Yoga', 'Books', 'Art'],
    drinking: 'No',
    smoking: 'No',
    relationship: 'Single',
    expectations: 'Meaningful connection',
    location: 'Koramangala, Bengaluru',
  },
  {
    id: '3',
    name: 'Ishaan',
    age: 27,
    distance: '1.2 km away',
    bio: 'Former cricketer, now building startups. Gym at 6, code till midnight.',
    job: 'Founder, Fintech',
    verified: false,
    online: true,
    images: ['https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=800'],
    interests: ['Startups', 'Cricket', 'Fitness', 'Podcasts'],
    drinking: 'Yes',
    smoking: 'Occasionally',
    relationship: 'Single',
    expectations: 'Casual to serious',
    location: 'Connaught Place, Delhi',
  },
  {
    id: '4',
    name: 'Meher',
    age: 25,
    distance: '8 km away',
    bio: 'Dancer & psychologist. Love to talk about feelings, films and filter coffee.',
    job: 'Clinical Psychologist',
    verified: true,
    online: true,
    images: ['https://images.unsplash.com/photo-1488426862026-3ee34e13d782?w=800'],
    interests: ['Dance', 'Psychology', 'Cinema', 'Coffee'],
    drinking: 'Occasionally',
    smoking: 'No',
    relationship: 'Single',
    expectations: 'Serious relationship',
    location: 'Jubilee Hills, Hyderabad',
  },
  {
    id: '5',
    name: 'Kabir',
    age: 28,
    distance: '3 km away',
    bio: 'Chef who can make perfect biryani. Looking for a co-taster for life.',
    job: 'Sous Chef',
    verified: true,
    online: false,
    images: ['https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=800'],
    interests: ['Cooking', 'Food', 'Travel', 'Guitar'],
    drinking: 'Occasionally',
    smoking: 'No',
    relationship: 'Divorced',
    expectations: 'Companionship',
    location: 'Pune',
  },
  {
    id: '6',
    name: 'Ananya',
    age: 23,
    distance: '4 km away',
    bio: "MBA grad, reader, runner. Let's race to the best bookstore in town?",
    job: 'MBA Student, IIM',
    verified: false,
    online: true,
    images: ['https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=800'],
    interests: ['Reading', 'Running', 'Finance', 'Memes'],
    drinking: 'No',
    smoking: 'No',
    relationship: 'Single',
    expectations: 'Dating',
    location: 'Indore',
  },
];

export type ChatItem = {
  id: string;
  user: UserCard;
  lastMessage: string;
  time: string;
  unread: number;
  online: boolean;
  status: 'sent' | 'delivered' | 'seen';
};

export const MOCK_CHATS: ChatItem[] = [
  { id: 'c1', user: MOCK_USERS[1], lastMessage: 'Haha that cafe sketch is amazing ✏️', time: '2m', unread: 2, online: true, status: 'delivered' },
  { id: 'c2', user: MOCK_USERS[3], lastMessage: 'You: See you at 7? ☕', time: '1h', unread: 0, online: true, status: 'seen' },
  { id: 'c3', user: MOCK_USERS[0], lastMessage: 'Would love to go trekking sometime!', time: 'Yesterday', unread: 0, online: false, status: 'seen' },
  { id: 'c4', user: MOCK_USERS[4], lastMessage: 'Sent a Super Like ❤️', time: 'Yesterday', unread: 1, online: false, status: 'sent' },
];

export type Message = { id: string; text: string; me: boolean; time: string; status?: 'sent' | 'delivered' | 'seen' };
