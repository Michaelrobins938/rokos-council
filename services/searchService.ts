import { SearchResult } from '../types';

export const performWebSearch = async (query: string): Promise<SearchResult[]> => {
  try {
    const response = await fetch(
      `https://ddg-api.vercel.app/search?q=${encodeURIComponent(query)}&max_results=5`
    );
    
    if (!response.ok) {
      throw new Error('Search failed');
    }

    const data = await response.json();
    
    return data.map((item: any) => ({
      title: item.title,
      url: item.url,
      snippet: item.body,
      source: new URL(item.url).hostname
    }));
  } catch (error) {
    console.error('Web search error:', error);
    return [];
  }
};

export const performNewsSearch = async (query: string): Promise<SearchResult[]> => {
  try {
    const response = await fetch(
      `https://ddg-api.vercel.app/news?q=${encodeURIComponent(query)}&max_results=5`
    );
    
    if (!response.ok) {
      throw new Error('News search failed');
    }

    const data = await response.json();
    
    return data.map((item: any) => ({
      title: item.title,
      url: item.url,
      snippet: item.body,
      source: item.source
    }));
  } catch (error) {
    console.error('News search error:', error);
    return [];
  }
};
