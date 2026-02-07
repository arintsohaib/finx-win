
'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Book, Calendar, ArrowRight } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

// Backdated blog posts (3 years old - October 2022)
const blogPosts = [
  {
    id: 1,
    title: 'Understanding Binary Options Trading in Cryptocurrency Markets',
    excerpt: 'Learn the fundamentals of binary options trading and how it applies to volatile crypto markets. Discover key strategies for risk management and profit optimization.',
    date: '2022-10-15',
    category: 'Trading Basics',
    readTime: '8 min read'
  },
  {
    id: 2,
    title: 'Top 5 Risk Management Strategies for Crypto Traders',
    excerpt: 'Master the art of protecting your capital with proven risk management techniques. From position sizing to stop-loss strategies, learn how to trade safely.',
    date: '2022-09-22',
    category: 'Risk Management',
    readTime: '10 min read'
  },
  {
    id: 3,
    title: 'Technical Analysis: Reading Chart Patterns for Binary Trading',
    excerpt: 'Dive deep into technical analysis and learn how to identify key chart patterns that can improve your trading decisions and timing.',
    date: '2022-08-10',
    category: 'Technical Analysis',
    readTime: '12 min read'
  },
  {
    id: 4,
    title: 'The Psychology of Trading: Overcoming Emotional Decisions',
    excerpt: 'Explore the mental aspects of trading and learn techniques to maintain discipline, manage fear and greed, and make rational trading decisions.',
    date: '2022-07-05',
    category: 'Trading Psychology',
    readTime: '7 min read'
  },
  {
    id: 5,
    title: 'Market Volatility: Turning Risk into Opportunity',
    excerpt: 'Understand how market volatility works and discover strategies to capitalize on price swings while managing downside risk effectively.',
    date: '2022-06-18',
    category: 'Market Analysis',
    readTime: '9 min read'
  },
  {
    id: 6,
    title: 'Web3 Integration: The Future of Decentralized Trading Platforms',
    excerpt: 'Explore how Web3 technology is revolutionizing trading platforms with enhanced security, transparency, and user control through blockchain integration.',
    date: '2022-05-30',
    category: 'Technology',
    readTime: '11 min read'
  }
];

export default function KnowledgePage() {
  const router = useRouter();

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-6xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-4">
            <Button
              variant="gradientGhost"
              size="sm"
              onClick={() => router.back()}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold">Knowledge Base</h1>
              <p className="text-sm text-muted-foreground">Trading guides, strategies, and educational resources</p>
            </div>
          </div>
        </div>

        {/* Blog Posts Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {blogPosts.map((post) => (
            <Card key={post.id} className="hover:shadow-lg transition-all duration-200 cursor-pointer group">
              <CardHeader>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-primary bg-primary/10 px-2 py-1 rounded">
                    {post.category}
                  </span>
                  <span className="text-xs text-muted-foreground flex items-center">
                    <Calendar className="h-3 w-3 mr-1" />
                    {formatDate(post.date)}
                  </span>
                </div>
                <CardTitle className="text-lg group-hover:text-primary transition-colors">
                  {post.title}
                </CardTitle>
                <CardDescription className="text-xs text-muted-foreground">
                  {post.readTime}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4 line-clamp-3">
                  {post.excerpt}
                </p>
                <Button variant="gradientGhost" size="sm" className="text-primary hover:text-primary/80 p-0">
                  Read More <ArrowRight className="h-3 w-3 ml-1" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Additional Resources */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="glass-card bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900">
            <CardContent className="p-6 text-center">
              <Book className="h-8 w-8 text-blue-600 dark:text-blue-400 mx-auto mb-3" />
              <h3 className="font-semibold text-blue-900 dark:text-blue-300 mb-2">Trading Guides</h3>
              <p className="text-xs text-blue-700 dark:text-blue-400">
                Comprehensive guides for beginners and advanced traders
              </p>
            </CardContent>
          </Card>

          <Card className="glass-card bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-900">
            <CardContent className="p-6 text-center">
              <Book className="h-8 w-8 text-green-600 dark:text-green-400 mx-auto mb-3" />
              <h3 className="font-semibold text-green-900 dark:text-green-300 mb-2">Risk Management</h3>
              <p className="text-xs text-green-700 dark:text-green-400">
                Learn to protect your capital and trade responsibly
              </p>
            </CardContent>
          </Card>

          <Card className="glass-card bg-purple-50 dark:bg-purple-950/20 border-purple-200 dark:border-purple-900">
            <CardContent className="p-6 text-center">
              <Book className="h-8 w-8 text-purple-600 dark:text-purple-400 mx-auto mb-3" />
              <h3 className="font-semibold text-purple-900 dark:text-purple-300 mb-2">FAQ</h3>
              <p className="text-xs text-purple-700 dark:text-purple-400">
                Find answers to commonly asked questions
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
