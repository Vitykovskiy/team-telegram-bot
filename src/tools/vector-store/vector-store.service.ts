import { Injectable } from '@nestjs/common';
import { OpenAIEmbeddings } from '@langchain/openai';
import { Chroma } from '@langchain/community/vectorstores/chroma';
import { Document, DocumentInterface } from '@langchain/core/documents';
import { StructuredTool } from '@langchain/core/tools';

@Injectable()
export class VectorStoreService {
  private vectorStore: Chroma;
  private embeddings: OpenAIEmbeddings;
  private readonly createTaskToolInstance: StructuredTool;
  private vectorStoresMap: Map<string, Chroma>;

  constructor() {
    /*         this.embeddings = new OpenAIEmbeddings({
                    apiKey: process.env.OPENAI_API_KEY,
                });
                this.vectorStore = new Chroma(this.embeddings, {
                    url: process.env.VECTOR_STORE_URL,
                    collectionName: "my_collection",
                });
        
                const vectoreStoreSevice = this;
        
                this.createTaskToolInstance = new (class extends StructuredTool {
                    name = 'createTasks';
                    description = 'Создаёт новые задачи и сохраняет их в БД';
                    schema = tasksArraySchema;
        
                    async _call(input: z.infer<typeof tasksArraySchema>): Promise<string> {
                        const createdTasks = await vectoreStoreSevice._createTasks(input.tasks);
                        const taskTitles = createdTasks.map((t) => `\n${t.code} - "${t.title}"`).join(', ');
                        return `Созданы задачи: ${taskTitles}`;
                    }
                })(); */
  }

  public async addDocuments(documents: Document[]): Promise<void> {
    try {
      await this.vectorStore.addDocuments(documents);
      console.log(`Added ${documents.length} documents`);
    } catch (err) {
      console.error('VectorStore addDocuments', err);
    }
  }

  public async search(
    request: string,
  ): Promise<DocumentInterface<Record<string, any>>[]> {
    let response: DocumentInterface<Record<string, any>>[] = [];
    try {
      response = await this.vectorStore.similaritySearch(request);
    } catch (err) {
      console.error('VectorStore search', err);
    }
    return response;
  }
}
