import { Injectable } from '@nestjs/common';

interface RandomUserResponse {
  results: Array<{
    gender: string;
    picture: {
      large: string;
      medium: string;
      thumbnail: string;
    };
  }>;
}

@Injectable()
export class RandomUserService {
  private readonly baseUrl = 'https://randomuser.me/api';

  /**
   * Fetch a random user photo URL based on gender
   * @param gender - 'male' or 'female'
   * @param size - 'large', 'medium', or 'thumbnail' (default: 'medium')
   * @returns Promise<string> - Photo URL
   */
  async getRandomUserPhoto(
    gender: 'male' | 'female',
    size: 'large' | 'medium' | 'thumbnail' = 'medium',
  ): Promise<string> {
    try {
      const response = await fetch(
        `${this.baseUrl}/?gender=${gender}&results=1`,
      );

      if (!response.ok) {
        throw new Error(`Random User API error: ${response.status}`);
      }

      const data = (await response.json()) as RandomUserResponse;

      if (!data.results || data.results.length === 0) {
        throw new Error('No user data received from Random User API');
      }

      const user = data.results[0];
      return user.picture[size];
    } catch (error) {
      console.error('Error fetching random user photo:', error);
      // Return a fallback placeholder image
      return `https://via.placeholder.com/200x200/cccccc/666666?text=${gender === 'male' ? 'M' : 'F'}`;
    }
  }

  /**
   * Fetch multiple random user photos
   * @param count - Number of photos to fetch
   * @param gender - 'male' or 'female'
   * @param size - 'large', 'medium', or 'thumbnail' (default: 'medium')
   * @returns Promise<string[]> - Array of photo URLs
   */
  async getRandomUserPhotos(
    count: number,
    gender: 'male' | 'female',
    size: 'large' | 'medium' | 'thumbnail' = 'medium',
  ): Promise<string[]> {
    try {
      const response = await fetch(
        `${this.baseUrl}/?gender=${gender}&results=${count}`,
      );

      if (!response.ok) {
        throw new Error(`Random User API error: ${response.status}`);
      }

      const data = (await response.json()) as RandomUserResponse;

      if (!data.results || data.results.length === 0) {
        throw new Error('No user data received from Random User API');
      }

      return data.results.map((user) => user.picture[size]);
    } catch (error) {
      console.error('Error fetching random user photos:', error);
      // Return fallback placeholder images
      return Array(count).fill(
        `https://via.placeholder.com/200x200/cccccc/666666?text=${gender === 'male' ? 'M' : 'F'}`,
      ) as string[];
    }
  }
}
