import { Router, Request, Response, response } from 'express';
import { FeedItem } from '../models/FeedItem';
import { requireAuth } from '../../users/routes/auth.router';
import * as AWS from '../../../../aws';

const router: Router = Router();

// Get all feed items
router.get('/', async (req: Request, res: Response) => {
    const items = await FeedItem.findAndCountAll({order: [['id', 'DESC']]});
    items.rows.map((item) => {
            if(item.url) {
                item.url = AWS.getGetSignedUrl(item.url);
            }
    });
    res.send(items);
});

//@TODO
//Add an endpoint to GET a specific resource by Primary Key
router.get('/:id', async (req: Request, res: Response) => {
    let {id} =  req.params;
    if(id){
    
    
    const item = await FeedItem.findByPk(req.params.id);
    if(item.url) {
    item.url = AWS.getGetSignedUrl(item.url);
    }
   
    res.send(item);
}else{
    res.status(400).send({ message: 'Id is required or malformed' });
}
});

// update a specific resource
router.patch('/:id', 
    requireAuth, 
    async (req: Request, res: Response, next) => {
        //@TODO try it yourself
        let {caption, url} = req.body;
        
        if(!caption || !url){
            res.status(400).send({message :"Caption and url are required"})
        }else{
            let {id} = req.params;
            if(!id){
                res.status(400).send({message :"Id is required"})
            }
           FeedItem.update({url:url,caption:caption},{returning:true, where:{id}}).then(([response,updatedRecord])=>{
            res.status(200).send(updatedRecord);
           }).catch(next);
           
        }
});


// Get a signed url to put a new item in the bucket
router.get('/signed-url/:fileName', 
    requireAuth, 
    async (req: Request, res: Response) => {
    let { fileName } = req.params;
    const url = AWS.getPutSignedUrl(fileName);
    res.status(201).send({url: url});
});

// Post meta data and the filename after a file is uploaded 
// NOTE the file name is they key name in the s3 bucket.
// body : {caption: string, fileName: string};
router.post('/', 
    requireAuth, 
    async (req: Request, res: Response) => {
    const caption = req.body.caption;
    const fileName = req.body.url;

    // check Caption is valid
    if (!caption) {
        return res.status(400).send({ message: 'Caption is required or malformed' });
    }

    // check Filename is valid
    if (!fileName) {
        return res.status(400).send({ message: 'File url is required' });
    }

    const item = await new FeedItem({
            caption: caption,
            url: fileName
    });

    const saved_item = await item.save();

    saved_item.url = AWS.getGetSignedUrl(saved_item.url);
    res.status(201).send(saved_item);
});

export const FeedRouter: Router = router;