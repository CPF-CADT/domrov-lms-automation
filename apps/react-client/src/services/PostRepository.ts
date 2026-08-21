/**
 * PostRepository - Service layer for managing class posts
 * Stores posts in localStorage with persistence
 */
interface Post {
  id: string;
  classId: string;
  content: string;
  author: string;
  authorRole: string;
  createdAt: string;
  updatedAt: string;
}

class PostRepository {
  private posts: Post[] = [];
  private isInitialized = false;

  /**
   * Initialize the repository by loading posts from localStorage
   */
  async initialize(classId: string): Promise<void> {
    if (this.isInitialized) return;

    try {
      const storageKey = `posts_${classId}`;
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        this.posts = JSON.parse(saved);
      } else {
        // Initialize with sample post
        this.posts = [
          {
            id: "post_1",
            classId,
            content: "Welcome to the class! Make sure to check the assignments section regularly.",
            author: "Teacher",
            authorRole: "teacher",
            createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
            updatedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
          },
        ];
        this.savePosts(classId);
      }
      this.isInitialized = true;
      console.log(`✅ PostRepository initialized with ${this.posts.length} posts`);
    } catch (error) {
      console.error("❌ Failed to initialize PostRepository:", error);
      this.posts = [];
      this.isInitialized = true;
    }
  }

  /**
   * Save posts to localStorage
   */
  private savePosts(classId: string): void {
    const storageKey = `posts_${classId}`;
    localStorage.setItem(storageKey, JSON.stringify(this.posts));
  }

  /**
   * Get all posts
   */
  getPosts(): Post[] {
    return [...this.posts].sort((a, b) => {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }

  /**
   * Create a new post
   */
  createPost(
    classId: string,
    content: string,
    author: string = "Teacher",
    authorRole: string = "teacher"
  ): Post {
    const newPost: Post = {
      id: `post_${Date.now()}`,
      classId,
      content,
      author,
      authorRole,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.posts.push(newPost);
    this.savePosts(classId);
    console.log(`✅ Post created: ${newPost.id}`);
    return newPost;
  }

  /**
   * Delete a post
   */
  deletePost(classId: string, postId: string): boolean {
    const index = this.posts.findIndex((p) => p.id === postId);
    if (index === -1) return false;

    this.posts.splice(index, 1);
    this.savePosts(classId);
    console.log(`🗑️ Post deleted: ${postId}`);
    return true;
  }

  /**
   * Clear all posts
   */
  clear(): void {
    this.posts = [];
    this.isInitialized = false;
  }
}

export const postRepository = new PostRepository();
export type { Post };
