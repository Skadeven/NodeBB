import db from '../database';
import plugins from '../plugins';
import utils from '../utils';

const intFields:string[] = [
    'uid', 'pid', 'tid', 'deleted', 'timestamp',
    'upvotes', 'downvotes', 'deleterUid', 'edited',
    'replies', 'bookmarks',
];

interface Post {
    [key: string]: any;
}

interface PostData {
    pids: number[];
    posts: Post[];
    fields: string[];
}

module.exports = function (Posts:any) {
    Posts.getPostsFields = async function (pids:number[], fields:string[]): Promise<Post[]>{
        if (!Array.isArray(pids) || !pids.length) {
            return [];
        }
        const keys: string[] = pids.map(pid => `post:${pid}`);
        const postData: Post[] = await db.getObjects(keys, fields);
        const result: PostData = await plugins.hooks.fire('filter:post.getFields', {
            pids: pids,
            posts: postData,
            fields: fields,
        });
        result.posts.forEach((post:Post) => modifyPost(post, fields));
        return result.posts;
    };

    Posts.getPostData = async function (pid:number): Promise<Post | null> {
        const posts: any[] = await Posts.getPostsFields([pid], []);
        return posts && posts.length ? posts[0] : null;
    };

    Posts.getPostsData = async function (pids:number[]): Promise<Post[]> {
        return await Posts.getPostsFields(pids, []);
    };

    Posts.getPostField = async function (pid: number, field: string): Promise<any> {
        const post:any = await Posts.getPostFields(pid, [field]);
        return post ? post[field] : null;
    };

    Posts.getPostFields = async function (pid: number, fields: string[]): Promise<any | null> {
        const posts: any[] = await Posts.getPostsFields([pid], fields);
        return posts ? posts[0] : null;
    };

    Posts.setPostField = async function (pid: number, field: string, value: any):Promise<void> {
        await Posts.setPostFields(pid, { [field]: value });
    };

    Posts.setPostFields = async function (pid: number, data: object): Promise<void> {
        await db.setObject(`post:${pid}`, data);
        plugins.hooks.fire('action:post.setFields', { data: { ...data, pid } });
    };
};

function modifyPost(post: Post, fields: string[]):void {
    if (post) {
        db.parseIntFields(post, intFields, fields);
        if (post.hasOwnProperty('upvotes') && post.hasOwnProperty('downvotes')) {
            post.votes = post.upvotes - post.downvotes;
        }
        if (post.hasOwnProperty('timestamp')) {
            post.timestampISO = utils.toISOString(post.timestamp);
        }
        if (post.hasOwnProperty('edited')) {
            post.editedISO = post.edited !== 0 ? utils.toISOString(post.edited) : '';
        }
    }
}