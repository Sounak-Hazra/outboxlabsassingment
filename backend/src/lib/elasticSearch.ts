import { Client } from "@elastic/elasticsearch";
import dotenv from "dotenv";

dotenv.config();

export const esClient = new Client({
  node: process.env.ELASTICSEARCH_URL || "http://localhost:9200",
  auth: {
    username: process.env.ELASTIC_USERNAME || "elastic",
    password: process.env.ELASTIC_PASSWORD as string,
  },
  tls: {
    rejectUnauthorized: false, 
  },
});

export const setupElasticsearch = async () => {
  const indexName = "emails";
  
  try {
    const indexExists = await esClient.indices.exists({ index: indexName });

    if (!indexExists) {
      await esClient.indices.create({
        index: indexName,
        mappings: {
          properties: {
            id: { type: "keyword" },
            campaignId: { type: "keyword" },
            userId: { type: "keyword" },
            recipientEmail: { type: "text" },
            subject: { type: "text" },
            status: { type: "keyword" },
            scheduledTime: { type: "date" },
            sentAt: { type: "date" },
          },
        },
      });
      console.log(`Elasticsearch index '${indexName}' created.`);
    } else {
      console.log(`Elasticsearch index '${indexName}' already exists.`);
    }
  } catch (error) {
    console.error("Elasticsearch setup failed:", error);
  }
};