#[cfg(test)]
mod tests {
    use crate::transfer::FileChunker;
    use crate::errors::TransferError;
    use tempfile::TempDir;
    use tokio::io::AsyncWriteExt;

    #[tokio::test]
    async fn test_file_chunker_new_reader() {
        let temp_dir = TempDir::new().unwrap();
        let file_path = temp_dir.path().join("test.txt");
        let test_data = vec![b'A'; 1000]; // 1KB file
        
        let mut file = tokio::fs::File::create(&file_path).await.unwrap();
        file.write_all(&test_data).await.unwrap();
        file.flush().await.unwrap();
        
        let chunker = FileChunker::new_reader(file_path, 256).await.unwrap();
        
        assert_eq!(chunker.file_size(), 1000);
        assert_eq!(chunker.chunk_size(), 256);
        assert_eq!(chunker.total_chunks(), 4); // ceil(1000/256) = 4
    }

    #[tokio::test]
    async fn test_file_chunker_new_writer() {
        let temp_dir = TempDir::new().unwrap();
        let file_path = temp_dir.path().join("output.txt");
        
        let chunker = FileChunker::new_writer(file_path.clone(), 1000, 256).await.unwrap();
        
        assert_eq!(chunker.file_size(), 1000);
        assert_eq!(chunker.chunk_size(), 256);
        assert_eq!(chunker.total_chunks(), 4);
        
        // File should be created
        assert!(file_path.exists());
    }

    #[tokio::test]
    async fn test_file_chunker_read_write_chunks() {
        let temp_dir = TempDir::new().unwrap();
        let input_path = temp_dir.path().join("input.txt");
        let output_path = temp_dir.path().join("output.txt");
        
        // Create input file with known data
        let test_data = (0..255u8).cycle().take(1000).collect::<Vec<u8>>(); // 1000 bytes of sequential data
        let mut file = tokio::fs::File::create(&input_path).await.unwrap();
        file.write_all(&test_data).await.unwrap();
        file.flush().await.unwrap();
        
        // Create chunkers
        let reader = FileChunker::new_reader(input_path, 256).await.unwrap();
        let writer = FileChunker::new_writer(output_path.clone(), 1000, 256).await.unwrap();
        
        // Read and write all chunks
        for chunk_id in 0..reader.total_chunks() {
            let chunk_data = reader.read_chunk(chunk_id as u32).await.unwrap();
            writer.write_chunk(chunk_id as u32, chunk_data).await.unwrap();
        }
        
        // Verify the output file matches the input
        let output_data = tokio::fs::read(&output_path).await.unwrap();
        assert_eq!(output_data, test_data);
    }

    #[tokio::test]
    async fn test_file_chunker_chunk_actual_size() {
        let temp_dir = TempDir::new().unwrap();
        let file_path = temp_dir.path().join("test.txt");
        let test_data = vec![b'A'; 1000]; // 1KB file
        
        let mut file = tokio::fs::File::create(&file_path).await.unwrap();
        file.write_all(&test_data).await.unwrap();
        file.flush().await.unwrap();
        
        let chunker = FileChunker::new_reader(file_path, 256).await.unwrap();
        
        // First 3 chunks should be full size
        assert_eq!(chunker.chunk_actual_size(0), 256);
        assert_eq!(chunker.chunk_actual_size(1), 256);
        assert_eq!(chunker.chunk_actual_size(2), 256);
        
        // Last chunk should be smaller
        assert_eq!(chunker.chunk_actual_size(3), 232); // 1000 - 3*256 = 232
        
        // Invalid chunk ID should return 0
        assert_eq!(chunker.chunk_actual_size(10), 0);
    }

    #[tokio::test]
    async fn test_file_chunker_invalid_chunk_id() {
        let temp_dir = TempDir::new().unwrap();
        let file_path = temp_dir.path().join("test.txt");
        let test_data = vec![b'A'; 1000];
        
        let mut file = tokio::fs::File::create(&file_path).await.unwrap();
        file.write_all(&test_data).await.unwrap();
        file.flush().await.unwrap();
        
        let chunker = FileChunker::new_reader(file_path, 256).await.unwrap();
        
        // Should fail with invalid chunk ID
        let result = chunker.read_chunk(100).await;
        assert!(result.is_err());
        
        if let Err(TransferError::FileError { message, .. }) = result {
            assert!(message.contains("exceeds total chunks"));
        } else {
            panic!("Expected FileError");
        }
    }
}