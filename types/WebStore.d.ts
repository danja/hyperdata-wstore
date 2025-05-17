import { Express } from 'express';
import { Request, Response } from 'express';
import { Config } from './config';

/**
 * Configuration interface for WebStore
 */
interface WebStoreConfig extends Config {
    storageDir?: string;
    username?: string;
    password?: string;
}

/**
 * WebStore Express application
 */
declare const app: Express;

/**
 * GET endpoint to retrieve a file or directory listing
 */
app.get('/:filepath(*)', (req: Request<{ filepath: string }>, res: Response) => void);

/**
 * POST endpoint to create a new file
 */
app.post('/:filepath(*)', (req: Request<{ filepath: string }>, res: Response) => void);

/**
 * PUT endpoint to create or update a file
 */
app.put('/:filepath(*)', (req: Request<{ filepath: string }>, res: Response) => void);

/**
 * DELETE endpoint to remove a file
 */
app.delete('/:filepath(*)', (req: Request<{ filepath: string }>, res: Response) => void);

export default app;
