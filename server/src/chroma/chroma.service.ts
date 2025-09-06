import { Injectable } from '@nestjs/common';
import { ChromaClient, Collection } from 'chromadb';
import { OpenAIEmbeddingFunction } from '@chroma-core/openai';

import { ConfigService } from '../config/config.service';

@Injectable()
export class ChromaService {
  private chromaClient: ChromaClient;
  public collection: Collection;

  constructor(private configService: ConfigService) {}

  async initialize(): Promise<void> {
    try {
      this.chromaClient = new ChromaClient({
        host: this.configService.chromaHost,
        port: this.configService.chromaPort,
      });

      await this.initializeCollection();
      console.log('✅ ChromaService initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize ChromaService:', error);
      throw error;
    }
  }

  public async initializeCollection(): Promise<Collection> {
    const collectionName = 'healthcare_conversations';

    // Create embedding function
    const embeddingFn = new OpenAIEmbeddingFunction({
      apiKey: this.configService.openaiApiKey,
      modelName: 'text-embedding-3-small',
    });

    let collection: Collection;

    try {
      collection = await this.chromaClient.getCollection({
        name: collectionName,
      });

      // Check if the collection is broken (no embedding function)
      if (!collection.embeddingFunction) {
        console.warn(
          `⚠️ Collection "${collectionName}" has no embedding function. Deleting and recreating...`,
        );
        await this.chromaClient.deleteCollection({ name: collectionName });

        collection = await this.chromaClient.createCollection({
          name: collectionName,
          metadata: {
            description: 'Healthcare conversation context and user data',
          },
          embeddingFunction: embeddingFn,
        });
      }
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (err: any) {
      // If collection doesn't exist, create it
      collection = await this.chromaClient.createCollection({
        name: collectionName,
        metadata: {
          description: 'Healthcare conversation context and user data',
        },
        embeddingFunction: embeddingFn,
      });
    }

    console.log(
      `✅ Collection "${collectionName}" is ready with embedding function.`,
    );
    this.collection = collection;
    return collection;
  }

  async addDocuments(
    ids: string[],
    documents: string[],
    metadatas: Record<string, any>[],
  ): Promise<void> {
    if (!this.collection) {
      throw new Error('Collection not initialized');
    }

    await this.collection.add({
      ids,
      documents,
      metadatas,
    });
  }

  async queryDocuments(
    queryText: string,
    nResults: number = 10,
    where?: Record<string, any>,
  ): Promise<any> {
    if (!this.collection) {
      throw new Error('Collection not initialized');
    }

    return await this.collection.query({
      queryTexts: [queryText],
      nResults,
      where,
    });
  }

  async deleteDocuments(ids: string[]): Promise<void> {
    if (!this.collection) {
      throw new Error('Collection not initialized');
    }

    await this.collection.delete({ ids });
  }
}
