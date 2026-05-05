import { NestFactory } from '@nestjs/core';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AppModule } from './app.module';
import { UsersService } from './users/users.service';
import { PostsService } from './posts/posts.service';
import { ChatService } from './chat/chat.service';
import { AdsService } from './ads/ads.service';
import { User } from './users/user.entity';
import { Post } from './posts/post.entity';
import { Like } from './posts/like.entity';
import { Comment } from './posts/comment.entity';
import { CommentLike } from './posts/comment-like.entity';
import { SavedPost } from './posts/saved-post.entity';
import { Reel } from './posts/reel.entity';
import { Ad } from './ads/ad.entity';
import { Follow } from './users/follow.entity';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function shuffle<T>(arr: T[]): T[] {
  return [...arr].sort(() => Math.random() - 0.5);
}

// ─── Seed data ────────────────────────────────────────────────────────────────

const USERS = [
  {
    username: 'mehdi.dev',
    email: 'mehdi@gmail.com',
    password: 'mehdi123',
    fullName: 'Mehdi Ait El Mehdi',
    avatar: 'https://i.pravatar.cc/150?img=11',
    bio: '📱 Mobile developer · React Native & NestJS\n🚀 Building cool stuff\n📍 Fes, Morocco',
  },
  {
    username: 'alex.photo',
    email: 'alex@gmail.com',
    password: 'alex123',
    fullName: 'Alex Chen',
    avatar: 'https://i.pravatar.cc/150?img=32',
    bio: '📷 Street & portrait photographer\n🌍 Currently: Paris → Tokyo\n💌 DM for collabs',
  },
  {
    username: 'maria_art',
    email: 'maria@gmail.com',
    password: 'maria123',
    fullName: 'Maria Vasquez',
    avatar: 'https://i.pravatar.cc/150?img=47',
    bio: '🎨 Digital & oil painter\n🖼️ Commissions open\n📍 Barcelona, Spain',
  },
  {
    username: 'lucas.travel',
    email: 'lucas@gmail.com',
    password: 'lucas123',
    fullName: 'Lucas Moreau',
    avatar: 'https://i.pravatar.cc/150?img=56',
    bio: '🌏 Travel & food blogger\n✈️ 52 countries & counting\n📍 Bali right now',
  },
  {
    username: 'sara.fit',
    email: 'sara@gmail.com',
    password: 'sara123',
    fullName: 'Sara Benali',
    avatar: 'https://i.pravatar.cc/150?img=25',
    bio: '💪 Fitness coach · Nutrition nerd\n🥗 Healthy recipes every week\n📍 Dubai',
  },
];

const POSTS: Array<{
  userIndex: number;
  imageUrl: string;
  caption: string;
  location: string;
}> = [
  {
    userIndex: 1, // alex
    imageUrl: 'https://picsum.photos/seed/paris1/600/600',
    caption: 'Golden hour never gets old ✨ #photography #goldenhourgram #paris',
    location: 'Paris, France',
  },
  {
    userIndex: 2, // maria
    imageUrl: 'https://picsum.photos/seed/art1/600/600',
    caption: 'New canvas, new story 🎨 72h of work, worth every second. #digitalart #illustration',
    location: 'Barcelona, Spain',
  },
  {
    userIndex: 0, // mehdi
    imageUrl: 'https://picsum.photos/seed/code1/600/600',
    caption: 'Dark mode + coffee = perfect dev session ☕ #reactnative #coding #developer',
    location: 'Fes, Morocco',
  },
  {
    userIndex: 3, // lucas
    imageUrl: 'https://picsum.photos/seed/bali1/600/600',
    caption: 'Rice terraces at sunrise 🌾 Worth waking up at 4am for #bali #travel #wanderlust',
    location: 'Ubud, Bali',
  },
  {
    userIndex: 4, // sara
    imageUrl: 'https://picsum.photos/seed/food1/600/600',
    caption: 'Açaí bowl prep 🫐 High protein, guilt-free. Recipe in bio! #healthyfood #fitness',
    location: 'Dubai, UAE',
  },
  {
    userIndex: 1,
    imageUrl: 'https://picsum.photos/seed/street1/600/600',
    caption: 'Street stories — every face has one 📸 #streetphotography #documentary #blackandwhite',
    location: 'Tokyo, Japan',
  },
  {
    userIndex: 2,
    imageUrl: 'https://picsum.photos/seed/watercolor1/600/600',
    caption: 'Watercolor study this morning 🌊 Still learning, always growing. #watercolor #artistsoninstagram',
    location: 'Home Studio',
  },
  {
    userIndex: 0,
    imageUrl: 'https://picsum.photos/seed/setup1/600/600',
    caption: 'The battlestation is ready 🖥️ Shipped 3 features today. #devsetup #productivity #buildinpublic',
    location: 'Remote',
  },
  {
    userIndex: 3,
    imageUrl: 'https://picsum.photos/seed/food2/600/600',
    caption: 'Pad Thai at 2am in a Bangkok alley — worth it 🍜 #streetfood #bangkok #foodie',
    location: 'Bangkok, Thailand',
  },
  {
    userIndex: 4,
    imageUrl: 'https://picsum.photos/seed/gym1/600/600',
    caption: 'Progressive overload week 8 💪 PRs getting broken every session. #gym #strengthtraining',
    location: 'Dubai, UAE',
  },
  {
    userIndex: 1,
    imageUrl: 'https://picsum.photos/seed/nature1/600/600',
    caption: 'When the fog rolls in at 6am ⛰️ Nature is the best photographer. #landscape #nature #hiking',
    location: 'Swiss Alps',
  },
  {
    userIndex: 2,
    imageUrl: 'https://picsum.photos/seed/portrait1/600/600',
    caption: 'New portrait series — "In Between" ✨ Exploring identity through color. #portrait #conceptualart',
    location: 'Barcelona, Spain',
  },
  {
    userIndex: 3,
    imageUrl: 'https://picsum.photos/seed/morocco1/600/600',
    caption: 'Lost in the medina and loving it 🕌 #morocco #marrakech #travel #culture',
    location: 'Marrakech, Morocco',
  },
  {
    userIndex: 4,
    imageUrl: 'https://picsum.photos/seed/smoothie1/600/600',
    caption: 'Sunday meal prep ✅ 5 days of clean eating sorted in 2 hours. #mealprep #nutrition #healthylifestyle',
    location: 'Dubai, UAE',
  },
  {
    userIndex: 0,
    imageUrl: 'https://picsum.photos/seed/app1/600/600',
    caption: 'Just shipped v2.0 of Sharely 🚀 Cursor pagination, live feed, stories. Open to feedback! #buildinpublic #expo',
    location: 'Fes, Morocco',
  },
];

const ADS = [
  {
    title: 'Essayer Gratuitement',
    mediaUrl: 'https://picsum.photos/seed/ad-tech/600/450',
    caption: '🚀 Notion AI — Organisez votre vie et votre travail en un seul endroit. Essai gratuit 30 jours.',
    ctaUrl: 'https://notion.so',
    sponsorName: 'Notion',
    isActive: true,
  },
  {
    title: 'Voir la Collection',
    mediaUrl: 'https://picsum.photos/seed/ad-fashion/600/450',
    caption: '👟 Nike Air Max 2025 — The next step in comfort. Disponible maintenant en ligne et en boutique.',
    ctaUrl: 'https://nike.com',
    sponsorName: 'Nike',
    isActive: true,
  },
  {
    title: 'Commencer',
    mediaUrl: 'https://picsum.photos/seed/ad-course/600/450',
    caption: '📚 Maîtrisez React Native en 8 semaines. Cours certifiant avec projets réels. -30% ce mois-ci.',
    ctaUrl: 'https://udemy.com',
    sponsorName: 'Udemy',
    isActive: true,
  },
];

// ─── Seed ─────────────────────────────────────────────────────────────────────

async function seed() {
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error'],
  });

  const usersService = app.get(UsersService);
  const postsService = app.get(PostsService);
  const chatService = app.get(ChatService);
  const adsService = app.get(AdsService);

  // Raw repos for bulk operations
  const userRepo = app.get<Repository<User>>(getRepositoryToken(User));
  const postRepo = app.get<Repository<Post>>(getRepositoryToken(Post));
  const likeRepo = app.get<Repository<Like>>(getRepositoryToken(Like));
  const commentRepo = app.get<Repository<Comment>>(getRepositoryToken(Comment));
  const commentLikeRepo = app.get<Repository<CommentLike>>(getRepositoryToken(CommentLike));
  const savedPostRepo = app.get<Repository<SavedPost>>(getRepositoryToken(SavedPost));
  const reelRepo = app.get<Repository<Reel>>(getRepositoryToken(Reel));
  const adRepo = app.get<Repository<Ad>>(getRepositoryToken(Ad));
  const followRepo = app.get<Repository<Follow>>(getRepositoryToken(Follow));

  // ── 1. Clear existing data (ordered to respect FK constraints) ────────────
  console.log('🗑️  Clearing existing data...');
  await commentLikeRepo.delete({});
  await savedPostRepo.delete({});
  await likeRepo.delete({});
  await commentRepo.delete({});
  await reelRepo.delete({});
  await postRepo.delete({});
  await adRepo.delete({});
  await followRepo.delete({});
  await userRepo.delete({});
  console.log('✅ Database cleared');

  // ── 2. Create users ───────────────────────────────────────────────────────
  console.log('\n👤 Creating users...');
  const users: User[] = [];

  for (const data of USERS) {
    const user = await usersService.create({
      username: data.username,
      email: data.email,
      password: data.password,
      fullName: data.fullName,
    });
    await userRepo.update(user.id, { avatar: data.avatar, bio: data.bio });
    users.push({ ...user, avatar: data.avatar, bio: data.bio });
    console.log(`  ✓ @${data.username}`);
  }

  // ── 3. Follow relations (realistic social graph) ──────────────────────────
  console.log('\n🔗 Creating follow relations...');
  const follows: Array<[number, number]> = [
    [0, 1], [0, 2], [0, 3], [0, 4], // mehdi follows everyone
    [1, 0], [1, 2], [1, 3],         // alex follows 3
    [2, 0], [2, 1], [2, 4],         // maria follows 3
    [3, 0], [3, 1], [3, 4],         // lucas follows 3
    [4, 0], [4, 2], [4, 3],         // sara follows 3
  ];

  for (const [fIdx, tIdx] of follows) {
    await usersService.follow(users[fIdx].id, users[tIdx].id);
  }
  console.log(`  ✓ ${follows.length} follow relations`);

  // ── 4. Create posts ───────────────────────────────────────────────────────
  console.log('\n📸 Creating posts...');
  const posts: Post[] = [];

  for (const p of POSTS) {
    const post = await postsService.createPost(users[p.userIndex].id, {
      imageUrl: p.imageUrl,
      caption: p.caption,
      location: p.location,
    });
    posts.push(post);
    console.log(`  ✓ Post by @${USERS[p.userIndex].username}: ${p.caption.slice(0, 40)}…`);
  }

  // ── 5. Create reels ───────────────────────────────────────────────────────
  console.log('\n🎬 Creating reels...');
  const reelsData = [
    {
      userIndex: 1,
      thumbnailUrl: 'https://picsum.photos/seed/reel-paris/600/1000',
      caption: 'Behind the lens in Paris 🌟 #photography #paris #goldenhourgram',
      audioTitle: '🎵 Lofi Chill — Autumn Breeze',
    },
    {
      userIndex: 2,
      thumbnailUrl: 'https://picsum.photos/seed/reel-art/600/1000',
      caption: 'Speed painting — portrait in 4 minutes 🎨 #digitalart #timelapse',
      audioTitle: '🎵 Ambient Dreams — Vol.3',
    },
    {
      userIndex: 0,
      thumbnailUrl: 'https://picsum.photos/seed/reel-code/600/1000',
      caption: 'Building a real-time feed in NestJS ⚡ #coding #nestjs #webdev',
      audioTitle: '🎵 Focus Mode — Deep Work',
    },
    {
      userIndex: 3,
      thumbnailUrl: 'https://picsum.photos/seed/reel-bali/600/1000',
      caption: 'Day 1 in Bali — everything is beautiful 🌴 #travel #bali #vlog',
      audioTitle: '🎵 Island Vibes — Summer Mix',
    },
    {
      userIndex: 4,
      thumbnailUrl: 'https://picsum.photos/seed/reel-gym/600/1000',
      caption: 'Morning workout routine 🔥 5 exercises, 20 minutes, max gains #fitness #workout',
      audioTitle: '🎵 Workout Beast — Pump Up',
    },
  ];

  for (const r of reelsData) {
    await postsService.createReel(users[r.userIndex].id, {
      thumbnailUrl: r.thumbnailUrl,
      caption: r.caption,
      audioTitle: r.audioTitle,
    });
    console.log(`  ✓ Reel by @${USERS[r.userIndex].username}`);
  }

  // ── 6. Create ads ─────────────────────────────────────────────────────────
  console.log('\n📢 Creating ads...');
  for (const ad of ADS) {
    await adsService.create(ad);
    console.log(`  ✓ Ad: ${ad.sponsorName}`);
  }

  // ── 7. Likes (realistic: each user likes some posts) ─────────────────────
  console.log('\n❤️  Creating likes...');
  const likePairs: Array<[number, number]> = [
    // post index, user index
    [0, 0], [0, 2], [0, 3], [0, 4],    // alex's paris post — liked by 4
    [1, 0], [1, 1], [1, 3],             // maria's art post
    [2, 1], [2, 2], [2, 3], [2, 4],    // mehdi's code post
    [3, 0], [3, 1], [3, 2], [3, 4],    // lucas's bali post
    [4, 0], [4, 1], [4, 3],             // sara's food post
    [5, 0], [5, 2], [5, 4],             // alex's street photo
    [6, 0], [6, 1], [6, 3],             // maria's watercolor
    [7, 1], [7, 2], [7, 3],             // mehdi's battlestation
    [8, 0], [8, 2], [8, 4],             // lucas's pad thai
    [9, 0], [9, 1], [9, 3],             // sara's gym
    [10, 0], [10, 2], [10, 4],          // alex's landscape
    [12, 0], [12, 1], [12, 4],          // lucas's morocco
    [14, 1], [14, 2], [14, 3], [14, 4], // mehdi's v2.0 post
  ];

  for (const [pIdx, uIdx] of likePairs) {
    await postsService.toggleLike(users[uIdx].id, posts[pIdx].id);
  }
  console.log(`  ✓ ${likePairs.length} likes`);

  // ── 8. Saves ──────────────────────────────────────────────────────────────
  console.log('\n🔖 Creating saves...');
  const savePairs: Array<[number, number]> = [
    [0, 0], [3, 1], [7, 2], [9, 0], [14, 3],
  ];
  for (const [pIdx, uIdx] of savePairs) {
    await postsService.toggleSave(users[uIdx].id, posts[pIdx].id);
  }
  console.log(`  ✓ ${savePairs.length} saved posts`);

  // ── 9. Comments ───────────────────────────────────────────────────────────
  console.log('\n💬 Creating comments...');

  // Post 0 — alex's paris photo
  const c1 = await postsService.addComment(users[0].id, posts[0].id, {
    content: 'Absolutely stunning shot! The light is perfect 🔥',
  });
  const c2 = await postsService.addComment(users[2].id, posts[0].id, {
    content: 'This makes me want to book a flight to Paris right now 😍',
  });
  // Reply to c2
  await postsService.addComment(users[1].id, posts[0].id, {
    content: 'Do it!! Paris in spring is a dream ✈️',
    parentId: c2.id,
  });

  // Post 2 — mehdi's code
  const c3 = await postsService.addComment(users[1].id, posts[2].id, {
    content: 'What stack are you using? Looks clean 👀',
  });
  await postsService.addComment(users[0].id, posts[2].id, {
    content: 'NestJS + Expo + PostgreSQL 🚀 loving it so far',
    parentId: c3.id,
  });
  await postsService.addComment(users[3].id, posts[2].id, {
    content: 'Ship it!! 🚢',
  });

  // Post 3 — lucas's bali
  await postsService.addComment(users[0].id, posts[3].id, {
    content: 'Adding Bali to my bucket list right now 🌾',
  });
  await postsService.addComment(users[4].id, posts[3].id, {
    content: 'I was there last year — the sunrise is even better in person!',
  });

  // Post 4 — sara's food
  await postsService.addComment(users[2].id, posts[4].id, {
    content: 'Can you share the recipe? Pretty please 🙏',
  });
  await postsService.addComment(users[3].id, posts[4].id, {
    content: 'Looks delicious! How many calories roughly?',
  });

  // Post 14 — mehdi's v2.0
  const c4 = await postsService.addComment(users[1].id, posts[14].id, {
    content: 'Just tested it — the infinite scroll is buttery smooth 🧈',
  });
  await postsService.addComment(users[2].id, posts[14].id, {
    content: 'Open source? Would love to contribute 🙌',
  });
  await postsService.addComment(users[0].id, posts[14].id, {
    content: 'Thanks for the kind words! Will open-source after cleanup 😄',
    parentId: c4.id,
  });

  console.log(`  ✓ 12 comments with replies`);

  // ── 10. Comment likes ─────────────────────────────────────────────────────
  console.log('\n👍 Creating comment likes...');
  const commentLikePairs: Array<[string, number]> = [
    [c1.id, 1], [c1.id, 3], [c1.id, 4],
    [c2.id, 0], [c2.id, 3],
    [c3.id, 0], [c3.id, 2],
    [c4.id, 0], [c4.id, 2], [c4.id, 3],
  ];
  for (const [cId, uIdx] of commentLikePairs) {
    await postsService.toggleCommentLike(users[uIdx].id, cId);
  }
  console.log(`  ✓ ${commentLikePairs.length} comment likes`);

  // ── 11. Chat messages ─────────────────────────────────────────────────────
  console.log('\n✉️  Creating messages...');
  await chatService.sendMessage(users[1].id, users[0].id, 'Dude that v2.0 feed is fire 🔥');
  await chatService.sendMessage(users[0].id, users[1].id, 'Thanks! Cursor pagination + Redis cache, smooth as butter 🧈');
  await chatService.sendMessage(users[2].id, users[0].id, 'Love the app! Can we collaborate on a post?');
  await chatService.sendMessage(users[3].id, users[4].id, 'Hey Sara! That meal prep tutorial was gold 💪');
  await chatService.sendMessage(users[4].id, users[3].id, 'Thanks Lucas! Your Bali content is insane btw 🌴');
  console.log('  ✓ 5 messages');

  // ── Summary ───────────────────────────────────────────────────────────────
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🎉 Seed complete!');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('\n📊 Summary:');
  console.log(`  • ${USERS.length} users`);
  console.log(`  • ${follows.length} follow relations`);
  console.log(`  • ${POSTS.length} posts`);
  console.log(`  • ${reelsData.length} reels`);
  console.log(`  • ${ADS.length} ads`);
  console.log(`  • ${likePairs.length} post likes`);
  console.log(`  • ${savePairs.length} saved posts`);
  console.log(`  • 12 comments (with replies)`);
  console.log(`  • ${commentLikePairs.length} comment likes`);
  console.log('\n🔑 Login credentials:');
  for (const u of USERS) {
    console.log(`  • ${u.email.padEnd(22)} / ${u.password}`);
  }
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  await app.close();
}

seed().catch((err) => {
  console.error('❌ Seed failed:', err.message ?? err);
  process.exit(1);
});
